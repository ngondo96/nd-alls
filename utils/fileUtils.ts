import { AppState } from './types';
declare const JSZip: any;

export const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArr = new ArrayBuffer(length);
    const view = new DataView(bufferArr);
    const channels = [];
    let i, sample;
    let offset = 0;
    let pos = 0;

    const setUint16 = (data: number) => {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    const setUint32 = (data: number) => {
        view.setUint32(pos, data, true);
        pos += 4;
    }

    // write WAVE header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit

    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    for (i = 0; i < buffer.numberOfChannels; i++) {
        channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset]));
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
            view.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++;
    }

    return new Blob([view], { type: 'audio/wav' });
};


export const downloadZip = async (state: AppState, showNotification: (msg: string) => void) => {
    const zip = new JSZip();

    if (state.step1.selectedTitle) {
        zip.file("01_title.txt", state.step1.selectedTitle.title);
    }
    if (state.step2.script) {
        zip.file("02_script.txt", state.step2.script);
    }
    if (state.step3.seo) {
        const seoContent = `Description:\n${state.step3.seo.description}\n\nHashtags:\n${state.step3.seo.hashtags}\n\nTags:\n${state.step3.seo.tags}`;
        zip.file("03_seo.txt", seoContent);
    }
    if (state.step4.prompts.length > 0) {
        zip.file("04_image_prompts.txt", state.step4.prompts.join("\n\n"));
    }
    if (state.step5.thumbnail) {
        const response = await fetch(state.step5.thumbnail);
        const blob = await response.blob();
        zip.file("05_thumbnail.jpg", blob);
    }
    if (state.step6.voiceAudio) {
        const wavBlob = audioBufferToWav(state.step6.voiceAudio);
        zip.file("06_voice.wav", wavBlob);
    }
    
    const titleSlug = state.step1.selectedTitle?.title
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
        .toLowerCase()
        .replace(/đ/g, 'd') // Handle Vietnamese 'đ'
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(/[^\w\-]+/g, '') // Remove all non-word chars
        .replace(/\-\-+/g, '-') // Replace multiple - with single -
        .replace(/^-+/, '') // Trim - from start of text
        .replace(/-+$/, '') || 'content'; // Trim - from end of text

    const filename = `ND_AllS_${titleSlug}.zip`;

    zip.generateAsync({ type: "blob" }).then(function(content: Blob) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification("Tải file zip thành công!");
    });
};