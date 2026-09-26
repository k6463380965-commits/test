import unittest

from musicxml import musicxml_to_transcription


class MusicXmlTranscriptionTests(unittest.TestCase):
    def test_converts_chord_rest_dotted_note_and_accidental(self):
        xml = b'''<score-partwise><part id="P1"><measure number="1">
          <attributes><divisions>16</divisions><time><beats>3</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
          <note><pitch><step>C</step><alter>0</alter><octave>4</octave></pitch><duration>16</duration><type>quarter</type></note>
          <note><chord/><pitch><step>E</step><alter>0</alter><octave>4</octave></pitch><duration>16</duration><type>quarter</type></note>
          <note><rest/><duration>8</duration><type>eighth</type></note>
          <note><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>24</duration><type>quarter</type><dot/></note>
        </measure></part></score-partwise>'''

        self.assertEqual(musicxml_to_transcription(xml), {
            'timeSignature': '3/4',
            'measures': [{'notes': [
                {'pitches': ['C4', 'E4'], 'duration': 'quarter', 'rest': False},
                {'pitches': [], 'duration': 'eighth', 'rest': True},
                {'pitches': ['F#4'], 'duration': 'dotted_quarter', 'rest': False},
            ]}],
        })

    def test_keeps_tied_segments_in_separate_measures(self):
        xml = b'''<score-partwise><part id="P1">
          <measure number="1"><attributes><divisions>16</divisions><clef><sign>G</sign><line>2</line></clef></attributes>
            <note><pitch><step>G</step><octave>4</octave></pitch><duration>32</duration><type>half</type><tie type="start"/></note>
          </measure>
          <measure number="2"><note><pitch><step>G</step><octave>4</octave></pitch><duration>32</duration><type>half</type><tie type="stop"/></note></measure>
        </part></score-partwise>'''

        result = musicxml_to_transcription(xml)
        self.assertEqual(len(result['measures']), 2)
        self.assertEqual(result['measures'][0]['notes'][0]['pitches'], ['G4'])
        self.assertEqual(result['measures'][1]['notes'][0]['pitches'], ['G4'])

    def test_rejects_multiple_staves_for_single_staff_contract(self):
        xml = b'''<score-partwise><part id="P1"><measure number="1">
          <note><pitch><step>C</step><octave>4</octave></pitch><duration>16</duration><type>quarter</type><staff>1</staff></note>
          <note><pitch><step>C</step><octave>3</octave></pitch><duration>16</duration><type>quarter</type><staff>2</staff></note>
        </measure></part></score-partwise>'''

        with self.assertRaisesRegex(ValueError, 'multiple staves'):
            musicxml_to_transcription(xml)

    def test_reinterprets_detected_staff_positions_using_selected_source_clef(self):
        xml = b'''<score-partwise><part id="P1"><measure number="1">
          <attributes><divisions>16</divisions><clef><sign>F</sign><line>4</line></clef></attributes>
          <note><pitch><step>G</step><octave>2</octave></pitch><duration>16</duration><type>quarter</type></note>
        </measure></part></score-partwise>'''

        result = musicxml_to_transcription(xml, 'treble')
        self.assertEqual(result['measures'][0]['notes'][0]['pitches'], ['E4'])


if __name__ == '__main__':
    unittest.main()