from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración de la app.

    Cada atributo se puede sobrescribir con una variable de entorno del mismo
    nombre (en mayúsculas) o desde el archivo .env. Si no está definida, se usa
    el valor por defecto que aparece acá.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_nombre: str = "CAOS Vintage API"
    database_url: str = "sqlite:///./caos.db"


settings = Settings()