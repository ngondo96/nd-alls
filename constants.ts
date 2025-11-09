export const LANGUAGE_OPTIONS = [
    { value: 'Vietnamese', label: 'Tiếng Việt' },
    { value: 'English', label: 'English' },
    { value: 'Spanish', label: 'Español' },
    { value: 'French', label: 'Français' },
];

export const TOPIC_OPTIONS = ['Lịch Sử', 'Tài chính', 'Sức Khoẻ', 'Công nghệ', 'Khoa học', 'Giải trí', 'Thể thao'];

export const NUM_TITLES_OPTIONS = [3, 5, 7, 10];

export const SCRIPT_SECTIONS_OPTIONS = Array.from({ length: 16 }, (_, i) => i + 5);

export const WORDS_PER_SECTION_OPTIONS = [500, 700, 1000, 1500];

export const CUSTOMIZATION_OPTIONS = ['Mở rộng', 'Giữ 70%', 'Chuyên sâu'];

export const IMAGE_STYLES = ['Cinematic', 'Photorealistic', 'Anime', 'Fantasy Art', '3D Render', 'Minimalist', 'Watercolor'];

export const THUMBNAIL_SIZES = [
    { value: '1280x720', label: '1280x720 (16:9)' },
    { value: '1920x1080', label: '1920x1080 (16:9)' },
    { value: '1080x1920', label: '1080x1920 (9:16)' },
    { value: '1080x1080', label: '1080x1080 (1:1)' },
];

export const VOICES = [
    { value: 'Kore', label: 'Giọng Nam 1 (Kore)' },
    { value: 'Puck', label: 'Giọng Nam 2 (Puck)' },
    { value: 'Charon', label: 'Giọng Nữ 1 (Charon)' },
    { value: 'Fenrir', label: 'Giọng Nữ 2 (Fenrir)' },
    { value: 'Zephyr', label: 'Giọng Nữ 3 (Zephyr)' },
];