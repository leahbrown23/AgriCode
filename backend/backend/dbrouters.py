class SensorSimRouter:
    """
    Routes all models in sensorsim_app to the 'sensorsim' database.
    Everything else stays on 'default'.
    """
    app_label = "sensorsim_app"

    def db_for_read(self, model, **hints):
        if model._meta.app_label == self.app_label:
            return "sensorsim"
        return None

    def db_for_write(self, model, **hints):
        if model._meta.app_label == self.app_label:
            return "sensorsim"
        return None

    def allow_migrate(self, db, app_label, **hints):
        if app_label == self.app_label:
            return db == "sensorsim"
        return db == "default"
