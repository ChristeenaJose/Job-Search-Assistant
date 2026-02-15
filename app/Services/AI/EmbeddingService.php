<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class EmbeddingService
{
    protected string $apiKey;

    public function __construct()
    {
        $this->apiKey = config('services.openai.key', '');
    }

    /**
     * Get the embedding vector for a piece of text.
     */
    public function getEmbedding(string $text): ?array
    {
        $geminiKey = config('services.gemini.key');

        // 1. Try Google Gemini (Free Tier)
        if ($geminiKey) {
            try {
                $response = Http::post("https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={$geminiKey}", [
                    'model' => 'models/gemini-embedding-001',
                    'content' => [
                        'parts' => [
                            ['text' => mb_strcut($text, 0, 8000)]
                        ]
                    ]
                ]);

                if ($response->successful()) {
                    $values = $response->json('embedding.values');
                    if ($values)
                        return $values;
                    Log::error('Gemini Embedding success but no values found: ' . $response->body());
                }

                Log::error('Gemini Embedding Failed: ' . $response->body());
            } catch (\Exception $e) {
                Log::error('Gemini Embedding Exception: ' . $e->getMessage());
            }
        }

        // 2. Fallback to OpenAI
        if (empty($this->apiKey)) {
            return null;
        }

        $heliconeKey = config('services.openai.helicone_key');
        $apiUrl = $heliconeKey
            ? 'https://oai.helicone.ai/v1/embeddings'
            : 'https://api.openai.com/v1/embeddings';

        try {
            $request = Http::withToken($this->apiKey);

            if ($heliconeKey) {
                $request->withHeaders([
                    'Helicone-Auth' => "Bearer {$heliconeKey}"
                ]);
            }

            $response = $request->post($apiUrl, [
                'model' => 'text-embedding-3-small',
                'input' => mb_strcut($text, 0, 8000), // Limit text to ~8k chars to avoid token limits
            ]);

            if ($response->successful()) {
                return $response->json('data.0.embedding');
            }

            Log::error('OpenAI Embedding Error: ' . $response->body());
        } catch (\Exception $e) {
            Log::error('Embedding Exception: ' . $e->getMessage());
        }

        return null;
    }

    /**
     * Calculate cosine similarity between two vectors.
     */
    public function cosineSimilarity(array $vec1, array $vec2): float
    {
        $dotProduct = 0;
        $normA = 0;
        $normB = 0;
        $count = min(count($vec1), count($vec2));

        for ($i = 0; $i < $count; $i++) {
            $dotProduct += $vec1[$i] * $vec2[$i];
            $normA += $vec1[$i] * $vec1[$i];
            $normB += $vec2[$i] * $vec2[$i];
        }

        $normA = sqrt($normA);
        $normB = sqrt($normB);

        if ($normA == 0 || $normB == 0) {
            return 0;
        }

        return $dotProduct / ($normA * $normB);
    }
}
