import re
import os

controller_path = "../../backend/src/controllers/mobileAuthController.js"
with open(controller_path, "r", encoding="utf-8") as f:
    controller_content = f.read()

if "mobileSyncWatch" not in controller_content:
    addition = """
const WatchData = require('../models/WatchData');
async function mobileSyncWatch(req, res) {
  try {
    const data = new WatchData({ userId: req.user.id, ...req.body });
    await data.save();
    return res.status(201).json(data);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to save watch data.' });
  }
}
"""
    controller_content = controller_content.replace(
        "module.exports = {",
        addition + "module.exports = { mobileSyncWatch,"
    )
    with open(controller_path, "w", encoding="utf-8") as f:
        f.write(controller_content)

routes_path = "../../backend/src/routes/mobileAuthRoutes.js"
with open(routes_path, "r", encoding="utf-8") as f:
    routes_content = f.read()

if "mobileSyncWatch" not in routes_content:
    routes_content = routes_content.replace(
        "module.exports = router;",
        "router.post('/watch-sync', authenticate, controller.mobileSyncWatch);\nmodule.exports = router;"
    )
    with open(routes_path, "w", encoding="utf-8") as f:
        f.write(routes_content)

print("backend updated")
