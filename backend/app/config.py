from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    lm_name: str = "gpt2"
    weights_path: str = "weights/best_merged.pt"
    max_new_tokens: int = 180
    num_beams: int = 4
    device: str = "auto"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    class Config:
        env_file = ".env"

settings = Settings()