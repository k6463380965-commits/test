import hmac
import os
import subprocess
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from PIL import Image, ImageOps

from musicxml import musicxml_to_transcription


app = FastAPI(title='Clef Transcriber OMR')
MAX_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_TYPES = {'image/png', 'image/jpeg', 'image/webp'}


@app.get('/health')
def health():
    return {'status': 'ok'}


@app.post('/transcribe')
def transcribe(
    file: UploadFile = File(...),
    source_clef: str = Form(...),
    authorization: str | None = Header(default=None),
):
    expected_token = os.environ.get('OMR_SERVICE_TOKEN', '')
    if not expected_token:
        raise HTTPException(status_code=503, detail='OMR_SERVICE_TOKEN is not configured.')
    if not authorization or not hmac.compare_digest(authorization, f'Bearer {expected_token}'):
        raise HTTPException(status_code=401, detail='Invalid OMR service token.')
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail='Use a PNG, JPG, JPEG, or WEBP image.')

    image_data = file.file.read(MAX_FILE_SIZE + 1)
    if not image_data:
        raise HTTPException(status_code=400, detail='The cropped image is empty.')
    if len(image_data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail='The cropped image exceeds 10 MB.')

    try:
        with tempfile.TemporaryDirectory(prefix='clef-omr-') as temp_dir:
            working_dir = Path(temp_dir)
            image_path = working_dir / 'score.png'
            output_dir = working_dir / 'output'
            output_dir.mkdir()

            from io import BytesIO
            with Image.open(BytesIO(image_data)) as image:
                ImageOps.exif_transpose(image).convert('RGB').save(image_path, format='PNG')

            try:
                result = subprocess.run(
                    ['oemer', str(image_path), '--output-path', str(output_dir)],
                    check=False,
                    capture_output=True,
                    text=True,
                    timeout=int(os.environ.get('OMR_TIMEOUT_SECONDS', '270')),
                )
            except subprocess.TimeoutExpired as error:
                raise HTTPException(status_code=504, detail='OMR took too long. Try cropping a smaller staff region.') from error

            if result.returncode != 0:
                detail = (result.stderr or result.stdout).strip()[-800:]
                print(f'Oemer failed: {detail}')
                raise HTTPException(status_code=422, detail='Oemer could not read this score image. Check the crop and try again.')

            musicxml_path = output_dir / 'score.musicxml'
            if not musicxml_path.is_file():
                raise HTTPException(status_code=502, detail='Oemer completed without producing MusicXML.')
            musicxml = musicxml_path.read_bytes()
            try:
                transcription = musicxml_to_transcription(musicxml, source_clef)
            except ValueError as error:
                raise HTTPException(status_code=422, detail=str(error)) from error
            return {'transcription': transcription, 'musicXml': musicxml.decode('utf-8', errors='replace')}
    except HTTPException:
        raise
    except Exception as error:
        print(f'OMR service error: {type(error).__name__}: {error}')
        raise HTTPException(status_code=500, detail='OMR service failed while processing this image.') from error