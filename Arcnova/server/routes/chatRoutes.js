import express from "express";

const router = express.Router();
console.log("Chat routes loaded");

router.post("/", async (req, res) => {
  try {
    console.log("Request received");

    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: "Message is required",
      });
    }

    const response = await fetch(
      "https://integrate.api.nvidia.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta/llama-3.1-8b-instruct",
          messages: [
            {
              role: "user",
              content: message,
            },
          ],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      }
    );

    const data = await response.json();

    console.log("NVIDIA Response:", data);

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data,
      });
    }

    const reply =
      data?.choices?.[0]?.message?.content ||
      "No response generated.";

    return res.json({
      success: true,
      reply,
    });
  } catch (error) {
    console.error("Chat Route Error:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;