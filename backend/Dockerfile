FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
WORKDIR /srv
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY app ./app
COPY data ./data
COPY migrations ./migrations
COPY alembic.ini ./
ENV PATH="/srv/.venv/bin:$PATH" PORT=8080
EXPOSE 8080
# Un'istanza sola: lo stato delle stanze sta in memoria (vedi PIANO_MVP.md, sezione 3).
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
