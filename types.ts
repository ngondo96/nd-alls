export interface GeneratedTitle {
    title: string;
    youtubeTrendScore: number;
}

export interface SeoData {
    description: string;
    hashtags: string;
    tags: string;
}

export interface AppState {
    step1: {
        input: string;
        file: File | null;
        language: string;
        topic: string;
        numTitles: number;
        titles: GeneratedTitle[];
        selectedTitle: GeneratedTitle | null;
    };
    step2: {
        numSections: number;
        wordsPerSection: number;
        script: string;
        customization: string;
    };
    step3: {
        seo: SeoData | null;
    };
    step4: {
        numPrompts: number;
        prompts: string[];
        style: string;
    };
    step5: {
        file: File | null;
        size: string;
        thumbnail: string | null; // base64 string
        useWatermark: boolean;
        watermarkText: string;
    };
    step6: {
        voice: string;
        voiceAudio: AudioBuffer | null;
    };
}

export interface LoadingStates {
    titles: boolean;
    script: boolean;
    seo: boolean;
    prompts: boolean;
    thumbnail: boolean;
    voice: boolean;
    download: boolean;
    voiceDemo: boolean;
}
