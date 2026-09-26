FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir --no-deps oemer==0.1.8

RUN package_dir="$(python -c 'from oemer import MODULE_PATH; print(MODULE_PATH)')" \
    && mkdir -p "$package_dir/checkpoints/unet_big" "$package_dir/checkpoints/seg_net" \
    && curl -fsSL https://github.com/BreezeWhite/oemer/releases/download/checkpoints/1st_model.onnx -o "$package_dir/checkpoints/unet_big/model.onnx" \
    && curl -fsSL https://github.com/BreezeWhite/oemer/releases/download/checkpoints/2nd_model.onnx -o "$package_dir/checkpoints/seg_net/model.onnx"

COPY app.py musicxml.py ./

EXPOSE 8001
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"]