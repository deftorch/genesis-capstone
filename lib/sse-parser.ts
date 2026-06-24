export interface UsageMetadata {
  candidatesTokenCount?: number;
  promptTokenCount?: number;
  totalTokenCount?: number;
}

export interface GeminiStreamChunk {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
  usageMetadata?: UsageMetadata;
}

export const parseSSEStream = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onChunk: (textChunk: string) => void,
  onDone?: (finalUsageMetadata: UsageMetadata | null) => void
) => {
  const decoder = new TextDecoder('utf-8');
  let done = false;
  let buffer = '';
  let finalUsageMetadata: UsageMetadata | null = null;

  while (!done) {
    const { value, done: readerDone } = await reader.read();
    done = readerDone;
    if (value) {
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Simpan sisa string yang belum selesai

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('data:')) {
          const dataStr = trimmedLine.slice(5).trim();
          if (dataStr === '[DONE]' || !dataStr) continue;
          try {
            const data: GeminiStreamChunk = JSON.parse(dataStr);
            if (data.usageMetadata) finalUsageMetadata = data.usageMetadata;
            
            const textChunk = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textChunk) {
              onChunk(textChunk);
            }
          } catch (e) {
            // Abaikan JSON yang tidak valid
          }
        }
      }
    }
  }

  if (buffer.trim().startsWith('data:')) {
    try {
      const dataStr = buffer.trim().slice(5).trim();
      if (dataStr && dataStr !== '[DONE]') {
        const data: GeminiStreamChunk = JSON.parse(dataStr);
        if (data.usageMetadata) finalUsageMetadata = data.usageMetadata;
        const textChunk = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textChunk) onChunk(textChunk);
      }
    } catch (e) {}
  }

  if (onDone) {
    onDone(finalUsageMetadata);
  }
};
