from fractions import Fraction
from xml.etree import ElementTree as ET


TYPE_TO_DURATION = {
    'long': 'whole',
    'breve': 'whole',
    'whole': 'whole',
    'half': 'half',
    'quarter': 'quarter',
    'eighth': 'eighth',
    '16th': 'sixteenth',
    '32nd': 'thirty_second',
    '64th': 'sixty_fourth',
}
DURATION_BEATS = {
    'whole': Fraction(4),
    'half': Fraction(2),
    'quarter': Fraction(1),
    'eighth': Fraction(1, 2),
    'sixteenth': Fraction(1, 4),
    'thirty_second': Fraction(1, 8),
    'sixty_fourth': Fraction(1, 16),
}
ALTERATIONS = {-2: 'bb', -1: 'b', 0: '', 1: '#', 2: '##'}
LETTER_INDEX = {'C': 0, 'D': 1, 'E': 2, 'F': 3, 'G': 4, 'A': 5, 'B': 6}
CLEF_BOTTOM_NOTE = {
    'treble': ('E', 4),
    'bass': ('G', 2),
    'alto': ('F', 3),
    'tenor': ('D', 3),
}


def child_text(element, name, default=None):
    child = element.find(name)
    if child is None or child.text is None:
        return default
    return child.text.strip()


def duration_name(note, divisions):
    note_type = child_text(note, 'type')
    duration = TYPE_TO_DURATION.get(note_type)
    if duration is None:
        ticks = child_text(note, 'duration')
        if ticks is None or divisions <= 0:
            raise ValueError('A note has no supported MusicXML duration.')
        beats = Fraction(int(ticks), divisions)
        duration = next((name for name, value in DURATION_BEATS.items() if value == beats), None)
        dotted = next((name for name, value in DURATION_BEATS.items() if value * Fraction(3, 2) == beats), None)
        if duration is None and dotted is not None:
            return f'dotted_{dotted}'
        if duration is None:
            raise ValueError(f'Unsupported MusicXML duration: {beats} quarter notes.')

    dots = len(note.findall('dot'))
    if dots > 1:
        raise ValueError('Double- or triple-dotted notes are not supported by the score renderer.')
    return f'dotted_{duration}' if dots else duration


def pitch_name(note, detected_clef, selected_clef):
    pitch = note.find('pitch')
    if pitch is None:
        raise ValueError('A pitched MusicXML note has no pitch element.')
    step = child_text(pitch, 'step')
    octave = child_text(pitch, 'octave')
    if step not in 'ABCDEFG' or octave is None:
        raise ValueError('A MusicXML pitch has an invalid step or octave.')
    alteration = float(child_text(pitch, 'alter', '0'))
    if not alteration.is_integer() or int(alteration) not in ALTERATIONS:
        raise ValueError(f'Unsupported MusicXML accidental alteration: {alteration}.')
    detected_letter, detected_octave = CLEF_BOTTOM_NOTE[detected_clef]
    selected_letter, selected_octave = CLEF_BOTTOM_NOTE[selected_clef]
    detected_bottom = detected_octave * 7 + LETTER_INDEX[detected_letter]
    selected_bottom = selected_octave * 7 + LETTER_INDEX[selected_letter]
    staff_position = int(octave) * 7 + LETTER_INDEX[step] - detected_bottom
    corrected_pitch = selected_bottom + staff_position
    corrected_octave, corrected_letter_index = divmod(corrected_pitch, 7)
    corrected_letter = next(letter for letter, index in LETTER_INDEX.items() if index == corrected_letter_index)
    return f'{corrected_letter}{ALTERATIONS[int(alteration)]}{corrected_octave}'


def musicxml_to_transcription(musicxml, selected_clef='treble'):
    if selected_clef not in CLEF_BOTTOM_NOTE:
        raise ValueError('Unsupported selected source clef.')
    try:
        root = ET.fromstring(musicxml)
    except ET.ParseError as error:
        raise ValueError('Oemer returned invalid MusicXML.') from error

    parts = root.findall('part')
    if not parts:
        raise ValueError('Oemer returned MusicXML without a score part.')

    part = parts[0]
    clef_element = part.find('.//clef')
    clef_sign = child_text(clef_element, 'sign') if clef_element is not None else 'G'
    clef_line = child_text(clef_element, 'line') if clef_element is not None else '2'
    detected_clef = {
        ('G', '2'): 'treble',
        ('F', '4'): 'bass',
        ('C', '3'): 'alto',
        ('C', '4'): 'tenor',
    }.get((clef_sign, clef_line))
    if detected_clef is None:
        raise ValueError('Oemer returned an unsupported source clef.')

    staff_numbers = {
        child_text(note, 'staff', '1')
        for note in part.findall('.//note')
    }
    if len(staff_numbers) > 1:
        raise ValueError('Oemer found multiple staves. Crop a single staff before transcribing.')

    divisions = 16
    time_signature = '4/4'
    measures = []
    for measure in part.findall('measure'):
        measure_notes = []
        last_event = None
        attributes = measure.find('attributes')
        if attributes is not None:
            divisions = int(child_text(attributes, 'divisions', str(divisions)))
            time = attributes.find('time')
            if time is not None:
                beats = child_text(time, 'beats')
                beat_type = child_text(time, 'beat-type')
                if beats and beat_type and beats.isdigit() and beat_type.isdigit():
                    time_signature = f'{beats}/{beat_type}'

        for note in measure.findall('note'):
            is_rest = note.find('rest') is not None
            note_duration = duration_name(note, divisions)
            pitches = [] if is_rest else [pitch_name(note, detected_clef, selected_clef)]
            is_chord_tone = note.find('chord') is not None
            if is_chord_tone and last_event is not None and not last_event['rest']:
                last_event['pitches'].extend(pitches)
                continue

            event = {'pitches': pitches, 'duration': note_duration, 'rest': is_rest}
            measure_notes.append(event)
            last_event = event

        measures.append({'notes': measure_notes})

    if not measures:
        raise ValueError('Oemer did not recognize any measures.')
    if len(measures) > 128:
        raise ValueError('The selected image contains too many measures. Crop one staff system.')
    return {'timeSignature': time_signature, 'measures': measures}