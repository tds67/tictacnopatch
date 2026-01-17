// netlify/functions/validate-code.js
exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const code = typeof body.code === "string" ? body.code.trim() : "";

    const secret = (process.env.SECRET_WIN_CODE || "").trim();

    // Case-insensitive match
    const ok =
      code.length > 0 &&
      secret.length > 0 &&
      code.toLowerCase() === secret.toLowerCase();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok }),
    };
  } catch (err) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false }),
    };
  }
};
