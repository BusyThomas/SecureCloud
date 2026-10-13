const express = require("express");
const { HttpError, problem } = require("./files/errors");

const DEMO_USER_ID = "8c71c880-fcb8-4ea8-a4e1-10c2118bd864";

function createIdentityDemoApp() {
  const app = express();

  app.get("/users/:userId/access-status", (req, res) => {
    if (req.params.userId !== DEMO_USER_ID) {
      return problem(
        res,
        new HttpError(
          404,
          "user-not-found",
          "User Not Found",
          "The requested user does not exist.",
        ),
      );
    }
    return res.status(200).json({ status: "active" });
  });

  return app;
}

if (require.main === module) {
  const port = Number(process.env.IDENTITY_DEMO_PORT || 5001);
  createIdentityDemoApp().listen(port, () => {
    console.log(`SecureCloud demo Identity Service running on port ${port}`);
  });
}

module.exports = { createIdentityDemoApp, DEMO_USER_ID };
