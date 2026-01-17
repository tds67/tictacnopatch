// netlify/functions/validate-code.js
exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const secret = (process.env.SECRET_WIN_CODE || "").trim();

    const ok =
      code.length > 0 &&
      secret.length > 0 &&
      code.toLowerCase() === secret.toLowerCase();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok }),
    };
  } catch {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false }),
    };
  }
};

