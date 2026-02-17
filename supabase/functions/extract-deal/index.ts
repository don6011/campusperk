import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: "Firecrawl not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    // Step 1: Validate URL is live & check redirects
    console.log("Validating URL:", formattedUrl);
    let urlValidation = { isLive: false, finalUrl: formattedUrl, redirectChain: [] as string[], statusCode: 0 };

    try {
      const headResp = await fetch(formattedUrl, { method: "GET", redirect: "follow" });
      urlValidation.isLive = headResp.ok;
      urlValidation.statusCode = headResp.status;
      urlValidation.finalUrl = headResp.url;
      if (headResp.redirected && headResp.url !== formattedUrl) {
        urlValidation.redirectChain = [formattedUrl, headResp.url];
      }
    } catch (e) {
      console.error("URL validation failed:", e);
      urlValidation.isLive = false;
    }

    // Step 2: Scrape page content with Firecrawl
    console.log("Scraping with Firecrawl...");
    let scrapedContent = "";
    let scrapeSuccess = false;

    try {
      const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: formattedUrl,
          formats: ["markdown"],
          onlyMainContent: true,
        }),
      });

      const scrapeData = await scrapeResp.json();
      if (scrapeResp.ok && scrapeData.success) {
        scrapedContent = scrapeData.data?.markdown || scrapeData.markdown || "";
        scrapeSuccess = true;
        console.log("Scrape successful, content length:", scrapedContent.length);
      } else {
        console.error("Firecrawl error:", scrapeData);
      }
    } catch (e) {
      console.error("Firecrawl scrape failed:", e);
    }

    // Step 3: AI extraction
    let extraction = null;

    if (scrapedContent) {
      // Truncate to avoid token limits
      const truncated = scrapedContent.slice(0, 8000);

      console.log("Running AI extraction...");
      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `You are a deal extraction assistant. Given webpage content, extract student discount details. Always respond using the extract_deal tool.`,
            },
            {
              role: "user",
              content: `Extract the student discount deal from this webpage content:\n\n${truncated}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_deal",
                description: "Extract structured deal information from webpage content",
                parameters: {
                  type: "object",
                  properties: {
                    store_name: { type: "string", description: "Brand or store name" },
                    deal_title: { type: "string", description: "Short title for the deal" },
                    discount_value: { type: "string", description: "e.g. 50%, $10 off, Free" },
                    deal_type: {
                      type: "string",
                      enum: ["percentage", "fixed", "free_trial", "bogo", "other"],
                      description: "Type of discount",
                    },
                    description: { type: "string", description: "Brief description of the deal" },
                    eligibility: { type: "string", description: "Who qualifies (e.g. students with .edu email)" },
                    requires_edu: { type: "boolean", description: "Whether .edu email is required" },
                    expiration_date: { type: "string", description: "Expiration date if found (YYYY-MM-DD format), or null" },
                    redemption_steps: { type: "string", description: "Step-by-step how to redeem" },
                    category: {
                      type: "string",
                      enum: ["Software", "Subscriptions", "Tech", "Clothing", "Food", "Learning", "Entertainment", "Fitness", "Travel", "Other"],
                      description: "Best matching category",
                    },
                    verification_provider: {
                      type: "string",
                      enum: ["sheerid", "unidays", "student_beans", "other", "none"],
                      description: "Student verification provider used",
                    },
                    confidence: {
                      type: "number",
                      description: "Confidence score 0-100 that this is a valid student deal",
                    },
                  },
                  required: ["store_name", "deal_title", "discount_value", "deal_type", "description", "requires_edu", "category", "confidence"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "extract_deal" } },
        }),
      });

      if (aiResp.ok) {
        const aiData = await aiResp.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          try {
            extraction = JSON.parse(toolCall.function.arguments);
            console.log("AI extraction successful:", extraction);
          } catch (e) {
            console.error("Failed to parse AI response:", e);
          }
        }
      } else {
        const status = aiResp.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "AI rate limit exceeded. Please try again later." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.error("AI gateway error:", status, await aiResp.text());
      }
    }

    return new Response(
      JSON.stringify({
        urlValidation,
        scrapeSuccess,
        extraction,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("extract-deal error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
