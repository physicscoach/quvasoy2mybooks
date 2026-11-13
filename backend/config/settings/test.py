from .dev import *  # noqa: F403

# Testlarda fon vazifalari o'zi ishga tushmaydi — har test kerakli vazifani aniq chaqiradi.
Q_CLUSTER = {**Q_CLUSTER, "sync": False}  # noqa: F405
