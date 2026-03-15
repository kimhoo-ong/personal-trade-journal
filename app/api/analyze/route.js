import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const analysisSchema = z.object({
  marketStatus: z.string(),
  trendStructure: z.string(),
  currentBehavior: z.string(),
  currentLeg: z.string(),
  bestTradeDecision: z.string(),
  entrySetup: z.string(),
  stopLoss: z.string(),
  target: z.string(),
  reasoning: z.string(),
  riskNote: z.string(),
});

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function POST(request) {
  if (!client) {
    return Response.json(
      { error: "缺少 OPENAI_API_KEY，请先在 .env.local 中配置。" },
      { status: 500 },
    );
  }

  try {
    const { market, timeframe, imageDataUrl } = await request.json();

    if (!imageDataUrl) {
      return Response.json({ error: "没有收到截图内容。" }, { status: 400 });
    }

    const prompt = [
      "你是一位专业的 Price Action / Trend Structure 交易分析助手。",
      "请根据图表截图判断市场结构，并严格按指定字段返回结构化结果。",
      "如果截图信息不够清晰，请在 reasoning 和 riskNote 里明确说明不确定性，但仍然给出最合理判断。",
      "",
      `市场：${market || "未提供"}`,
      `时间周期：${timeframe || "未提供"}`,
      "",
      "请分析以下内容：",
      "1. 市场状态：Strong Trend / Weak Trend / Trading Range / Possible Reversal",
      "2. 趋势结构：HH HL / LH LL / Range",
      "3. 当前行为：Breakout / Pullback / Bounce / Parabolic",
      "4. 当前腿：First Leg / Second Leg",
      "5. 最佳交易决策：Long / Short / Wait",
      "6. 入场位置：例如 H2 buy / Wedge pullback / Micro double bottom / Bear flag short / Second leg short",
      "7. 止损：例如 pullback low / bounce high",
      "8. 目标：例如 前高 / measured move / support / resistance",
      "",
      "额外要求：",
      "- 输出字段必须用简洁交易术语。",
      "- reasoning 用 2 到 4 句话说明判断依据。",
      "- riskNote 用 1 到 2 句话提示无效条件、风险或等待确认点。",
    ].join("\n");

    const response = await client.responses.parse({
      model: process.env.OPENAI_MODEL || "gpt-4.1",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: prompt,
            },
            {
              type: "input_image",
              image_url: imageDataUrl,
            },
          ],
        },
      ],
      text: {
        format: zodTextFormat(analysisSchema, "trend_detection_analysis"),
      },
    });

    const analysis = response.output_parsed;

    if (!analysis) {
      return Response.json({ error: "模型没有返回可解析的结构化结果。" }, { status: 502 });
    }

    return Response.json({ analysis });
  } catch (error) {
    console.error("Analysis request failed:", error);

    return Response.json(
      {
        error:
          error?.message || "调用 OpenAI API 时发生错误，请检查模型配置和截图格式。",
      },
      { status: 500 },
    );
  }
}
