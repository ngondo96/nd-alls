import { GoogleGenAI, Type, Modality } from '@google/genai';
import { GeneratedTitle, SeoData } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const decode = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const decodeAudioData = async (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
};

const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
    return {
        inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
};

export const generateTitles = async (content: string, language: string, topic: string, numTitles: number): Promise<GeneratedTitle[]> => {
    const prompt = `
        Dựa trên nội dung sau về chủ đề "${topic}" bằng ngôn ngữ "${language}", hãy tạo ra ${numTitles} tiêu đề YouTube hấp dẫn.
        
        NỘI DUNG:
        ---
        ${content}
        ---

        YÊU CẦU BẮT BUỘC:
        1. Tuân thủ các công thức tạo tiêu đề triệu view sau:
           - [GÂY TÒ MÒ] + [VẤN ĐỀ CỤ THỂ] + [KẾT QUẢ BẤT NGỜ]
           - [SỐ LƯỢT CỤ THỂ] + [VẤN ĐÊ HOẶC GIẢI PHÁP] + [LỢI ÍCH HOẶC HẬU QUẢ] (ưu tiên số lẻ 3, 5, 7)
           - [PHỦ ĐỊNH - CẢNH BÁO] + [ĐIỀU AI CŨNG LÀM]
           - [CÂU HỎI HOẶC TỪ KHÓA KHIÊU KHÍCH CẢM XÚC]
           - [TÊN NHÓM ĐỐI TƯỢNG] + [THÓI QUEN / BÍ QUYẾT]
        2. Sử dụng các từ khóa cảm xúc mạnh như "không ngờ", "đáng sợ", "bí mật", "giàu có", "tỉnh lại".
        3. Giữ tiêu đề ngắn gọn (tối đa 39 ký tự nếu có thể) nhưng vẫn trung thực.
        4. Với mỗi tiêu đề, hãy cung cấp một "Điểm Trend Youtube" (youtubeTrendScore) từ 1 đến 100 để đánh giá tiềm năng lan truyền.

        Định dạng đầu ra phải là một chuỗi JSON hợp lệ.
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        youtubeTrendScore: { type: Type.NUMBER }
                    },
                    required: ["title", "youtubeTrendScore"]
                }
            }
        }
    });

    try {
        const jsonString = response.text.trim();
        return JSON.parse(jsonString) as GeneratedTitle[];
    } catch (e) {
        console.error("Failed to parse titles JSON:", e);
        // Fallback or error handling
        return [];
    }
};


export const generateScript = async (title: string, numSections: number, wordsPerSection: number, language: string, customization: string, originalContent: string | null): Promise<string> => {
    const contentGuidance = originalContent
        ? `
        YÊU CẦU VỀ NỘI DUNG:
        - BẮT BUỘC phải phát triển kịch bản dựa trên NỘI DUNG GỐC được cung cấp dưới đây.
        - Áp dụng tùy chọn Tuỳ Chỉnh "${customization}" trực tiếp vào NỘI DUNG GỐC:
            - 'Mở rộng': Mở rộng các ý tưởng chính từ nội dung gốc, bổ sung thêm ví dụ, giải thích và các chi tiết liên quan để làm phong phú thêm kịch bản.
            - 'Giữ 70%': Chắt lọc và tóm tắt NỘI DUNG GỐC, chỉ giữ lại khoảng 70% những ý tưởng quan trọng và cốt lõi nhất.
            - 'Chuyên sâu': Phân tích sâu các khía cạnh trong NỘI DUNG GỐC, sử dụng thuật ngữ chuyên ngành, đưa ra các lập luận phức tạp và khám phá các chủ đề ở mức độ chuyên gia.

        NỘI DUNG GỐC:
        ---
        ${originalContent}
        ---
        `
        : `
        YÊU CẦU VỀ NỘI DUNG:
        - Dựa vào tiêu đề, hãy tự do sáng tạo nội dung.
        - Áp dụng tùy chọn Tuỳ Chỉnh "${customization}" vào nội dung bạn tạo ra:
            - 'Mở rộng': Viết nội dung dài hơn một chút, thêm các chi tiết phụ và ví dụ.
            - 'Giữ 70%': Rút gọn nội dung, chỉ giữ lại 70% các ý chính quan trọng nhất.
            - 'Chuyên sâu': Đi sâu vào phân tích, sử dụng thuật ngữ chuyên ngành và lập luận phức tạp.
        `;
    
    const prompt = `
        Tạo một kịch bản video chi tiết bằng ngôn ngữ "${language}" cho tiêu đề YouTube: "${title}".
        
        ${contentGuidance}

        YÊU CẦU VỀ CẤU TRÚC:
        1. Chia kịch bản thành chính xác ${numSections} phân đoạn LỚN.
        2. Mỗi phân đoạn LỚN phải có khoảng ${wordsPerSection} từ.
        3. Cấu trúc đầu ra phải tuân thủ nghiêm ngặt định dạng sau:
           - Dòng đầu tiên là Tiêu Đề chính của video.
           - Mỗi phân đoạn LỚN phải bắt đầu bằng một Tiêu đề phần hấp dẫn. QUAN TRỌNG: Tiêu đề phần này KHÔNG được chứa tiền tố như "Tiêu đề phần 1:", "Phần 1:", v.v. Chỉ viết ra tiêu đề thực tế.
           - Theo sau tiêu đề phần là nội dung chi tiết. BẮT BUỘC: Nội dung này phải được chia thành nhiều đoạn văn nhỏ, và mỗi đoạn văn cách nhau bằng một dòng trống.
           - Các phân đoạn LỚN (gồm tiêu đề phần và nội dung) cũng được cách nhau bằng một dòng trống.

        VÍ DỤ ĐỊNH DẠNG:
        ${title}

        [AI tự sinh ra một tiêu đề hấp dẫn cho phần 1]
        Nội dung đoạn văn đầu tiên của phần 1...

        Nội dung đoạn văn thứ hai của phần 1...

        [AI tự sinh ra một tiêu đề hấp dẫn cho phần 2]
        Nội dung đoạn văn đầu tiên của phần 2...
        
        LƯU Ý QUAN TRỌNG:
        - Chỉ trả về nội dung thuần túy, không chứa bất kỳ ký tự đặc biệt nào như markdown (*, #, _, etc.).
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt
    });

    return response.text;
};

export const generateSeo = async (title: string, scriptContent: string, language: string): Promise<SeoData> => {
    const prompt = `
        Dựa vào tiêu đề "${title}" và nội dung kịch bản sau bằng ngôn ngữ "${language}", hãy tạo ra siêu dữ liệu SEO chuẩn cho một video YouTube.
        
        KỊCH BẢN:
        ---
        ${scriptContent.substring(0, 4000)}...
        ---
        
        YÊU CẦU:
        1.  **description**: Viết một mô tả hấp dẫn, chuẩn SEO và có độ tin cậy cao. Mô tả phải được phân đoạn rõ ràng, sử dụng ngắt dòng hợp lý để dễ đọc. Kết thúc bằng một lời kêu gọi hành động (CTA) mạnh mẽ.
        2.  **hashtags**: Cung cấp một chuỗi các hashtag liên quan, bắt đầu bằng # và cách nhau bởi dấu cách.
        3.  **tags**: Cung cấp một chuỗi các tag (từ khóa) liên quan, cách nhau bằng dấu phẩy.
        
        Định dạng đầu ra phải là một chuỗi JSON hợp lệ.
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    description: { type: Type.STRING },
                    hashtags: { type: Type.STRING },
                    tags: { type: Type.STRING }
                },
                required: ["description", "hashtags", "tags"]
            }
        }
    });

    const jsonString = response.text.trim();
    return JSON.parse(jsonString) as SeoData;
};

export const generateImagePrompts = async (scriptContent: string, numPrompts: number, language: string, style: string): Promise<string[]> => {
    const prompt = `
        Dựa trên toàn bộ kịch bản video sau bằng ngôn ngữ "${language}", hãy tạo ra các prompt chi tiết để tạo ảnh bằng AI.

        KỊCH BẢN VIDEO:
        ---
        ${scriptContent}
        ---

        YÊU CẦU BẮT BUỘC:
        1.  Xác định các phân đoạn chính trong kịch bản (mỗi phân đoạn thường bắt đầu bằng một dòng tiêu đề ngắn).
        2.  Với MỖI phân đoạn đã xác định, hãy tạo ra chính xác ${numPrompts} prompt ảnh.
        3.  Mỗi prompt phải mô tả một hình ảnh có chứa một lớp phủ văn bản (Text Overlay).
        4.  Nội dung của Text Overlay phải là thông điệp chính hoặc một câu trích dẫn ngắn gọn, hấp dẫn từ phân đoạn kịch bản tương ứng. Text Overlay phải được viết bằng ngôn ngữ "${language}".
        5.  Mô tả rằng màu sắc của Text Overlay phải tương phản mạnh với nền để tăng tỷ lệ nhấp chuột (CTR).
        6.  Prompt phải chi tiết, điện ảnh, và hấp dẫn về mặt hình ảnh.
        7.  Phong cách hình ảnh phải là: "${style}".

        Định dạng đầu ra phải là một chuỗi JSON hợp lệ chứa một mảng duy nhất gồm tất cả các chuỗi prompt đã tạo.
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        }
    });
    
    try {
        const jsonString = response.text.trim();
        return JSON.parse(jsonString) as string[];
    } catch (e) {
        console.error("Failed to parse prompts JSON:", e);
        return [];
    }
};

export const generateThumbnail = async (title: string, scriptContent: string, size: string, language: string, style: string, sampleImage: File | null, useWatermark: boolean, watermarkText: string): Promise<string | null> => {
    const [width, height] = size.split('x');
    const aspectRatio = `${parseInt(width, 10) > parseInt(height, 10) ? '16:9' : parseInt(width, 10) < parseInt(height, 10) ? '9:16' : '1:1'}`;

    let styleGuidance = `The overall visual style must be "${style}".`;
    if (sampleImage) {
        try {
            const imagePart = await fileToGenerativePart(sampleImage);
            const visionPrompt = `Describe the visual style, color palette, composition, mood, and key elements of this image in detail. This description will be used to guide an image generation AI to create a similar image. Be very specific about artistic style (e.g., 'photorealistic', 'cinematic', 'anime', 'fantasy art') and lighting.`;
            
            const visionResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [imagePart, { text: visionPrompt }] }
            });
            
            const styleDescription = visionResponse.text;
            styleGuidance = `Replicate the following visual style as closely as possible: "${styleDescription}".`;
        } catch(e) {
            console.error("Error analyzing sample image:", e);
            styleGuidance = `The overall visual style (colors, composition, mood) should be inspired by the provided sample image file named ${sampleImage.name}, while adhering to a general "${style}" feel.`;
        }
    }

    const prompt = `
        Generate a professional YouTube thumbnail based on the following requirements. The output image MUST strictly adhere to the specified aspect ratio.

        - Video Title: "${title}"
        - Video Content Summary: "${scriptContent.substring(0, 200)}..."
        - Language for all text: "${language}"

        **Core Instructions:**

        1.  **Primary Text Overlay**:
            - The thumbnail MUST feature the exact text: "${title}".
            - This text should be the main focus, large, bold, and easy to read.
            - Use a color palette for the text that has extremely high contrast against the background to maximize Click-Through Rate (CTR).

        2.  **Imagery & Composition**:
            - Create an image based on the title and content summary.
            - The background image must be dynamic, emotionally engaging, and directly reflect the video's title and content.
            - The composition should be professional, adding or removing details as necessary to make the central subject and text stand out dramatically.

        3.  **Visual Style**:
            ${styleGuidance}

        ${useWatermark && watermarkText ? `
        4.  **Watermark Requirement**:
            - The thumbnail MUST include a watermark with the exact text: "${watermarkText}".
            - The watermark should be placed in a corner (e.g., bottom right).
            - The watermark text must be clearly legible, with high-contrast colors against its immediate background. It should be secondary to the main title.
        ` : ""}
    `;
    
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: aspectRatio as "1:1" | "16:9" | "9:16" | "4:3" | "3:4"
        },
    });

    const base64ImageBytes = response?.generatedImages?.[0]?.image?.imageBytes;
    if (base64ImageBytes) {
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    }
    console.error("Image generation failed or returned an invalid response:", response);
    return null;
};

export const generateVoice = async (scriptContent: string, voiceName: string): Promise<AudioBuffer | null> => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: scriptContent }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voiceName },
                },
            },
        },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
        const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const audioBuffer = await decodeAudioData(
            decode(base64Audio),
            outputAudioContext,
            24000,
            1,
        );
        return audioBuffer;
    }
    return null;
};

export const generateDemoVoice = async (voiceName: string): Promise<AudioBuffer | null> => {
    const demoText = "Đây là giọng nói mẫu để bạn tham khảo.";
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: demoText }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voiceName },
                },
            },
        },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
        const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const audioBuffer = await decodeAudioData(
            decode(base64Audio),
            outputAudioContext,
            24000,
            1,
        );
        return audioBuffer;
    }
    return null;
};
