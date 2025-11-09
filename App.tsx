
import React, { useState, useEffect, useRef } from 'react';
import { LANGUAGE_OPTIONS, TOPIC_OPTIONS, NUM_TITLES_OPTIONS, SCRIPT_SECTIONS_OPTIONS, WORDS_PER_SECTION_OPTIONS, THUMBNAIL_SIZES, VOICES, CUSTOMIZATION_OPTIONS, IMAGE_STYLES } from './constants';
import { GeneratedTitle, AppState, LoadingStates } from './types';
import * as geminiService from './services/geminiService';
import { downloadZip } from './utils/fileUtils';
import { StepCard } from './components/StepCard';
import { CopyButton } from './components/CopyButton';
import { UploadIcon, DownloadIcon, GenerateIcon, PlayIcon, LoadingSpinnerIcon, CheckIcon, ClipboardIcon } from './components/icons';

const App: React.FC = () => {
    const [state, setState] = useState<AppState>({
        step1: { input: '', file: null, language: 'Vietnamese', topic: 'Lịch Sử', numTitles: 5, titles: [], selectedTitle: null },
        step2: { numSections: 5, wordsPerSection: 500, script: '', customization: 'Mở rộng' },
        step3: { seo: null },
        step4: { numPrompts: 1, prompts: [], style: 'Cinematic' },
        step5: { file: null, size: '1280x720', thumbnail: null, useWatermark: false, watermarkText: '' },
        step6: { voice: 'Kore', voiceAudio: null },
    });
    const [loading, setLoading] = useState<LoadingStates>({
        titles: false, script: false, seo: false, prompts: false, thumbnail: false, voice: false, download: false, voiceDemo: false
    });
    const [notification, setNotification] = useState<string>('');
    const audioContextRef = useRef<AudioContext | null>(null);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const showNotification = (message: string) => {
        setNotification(message);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, step: 1 | 5) => {
        const file = e.target.files?.[0] || null;
        if (step === 1) {
            setState(s => ({ ...s, step1: { ...s.step1, file: file, input: '' } }));
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const text = event.target?.result as string;
                    setState(s => ({ ...s, step1: { ...s.step1, input: text } }));
                };
                reader.readAsText(file);
            }
        } else { // step 5
            setState(s => ({ ...s, step5: { ...s.step5, file: file } }));
        }
    };
    
    const handleGenerateTitles = async () => {
        if (!state.step1.input) {
            showNotification('Vui lòng nhập nội dung hoặc tải file lên.');
            return;
        }
        setLoading(l => ({ ...l, titles: true }));
        try {
            const titles = await geminiService.generateTitles(state.step1.input, state.step1.language, state.step1.topic, state.step1.numTitles);
            setState(s => ({ ...s, step1: { ...s.step1, titles } }));
        } catch (error) {
            console.error('Error generating titles:', error);
            showNotification('Lỗi khi tạo tiêu đề.');
        } finally {
            setLoading(l => ({ ...l, titles: false }));
        }
    };
    
    const handleSelectTitle = (title: GeneratedTitle) => {
        setState(s => ({...s, step1: {...s.step1, selectedTitle: title}}));
    };

    const handleGenerateScript = async () => {
        if (!state.step1.selectedTitle) {
            showNotification('Vui lòng chọn một tiêu đề ở BƯỚC 1.');
            return;
        }
        setLoading(l => ({ ...l, script: true }));
        try {
            const originalContent = state.step1.input.split(/\s+/).filter(Boolean).length > 50 ? state.step1.input : null;
            const script = await geminiService.generateScript(
                state.step1.selectedTitle.title, 
                state.step2.numSections, 
                state.step2.wordsPerSection, 
                state.step1.language, 
                state.step2.customization,
                originalContent
            );
            setState(s => ({ ...s, step2: { ...s.step2, script } }));
        } catch (error) {
            console.error('Error generating script:', error);
            showNotification('Lỗi khi tạo kịch bản.');
        } finally {
            setLoading(l => ({ ...l, script: false }));
        }
    };
    
    const handleGenerateSeo = async () => {
        if (!state.step1.selectedTitle || !state.step2.script) {
            showNotification('Vui lòng tạo tiêu đề và kịch bản trước.');
            return;
        }
        setLoading(l => ({...l, seo: true}));
        try {
            const seo = await geminiService.generateSeo(state.step1.selectedTitle.title, state.step2.script, state.step1.language);
            setState(s => ({ ...s, step3: { seo } }));
        } catch (error) {
            console.error('Error generating SEO:', error);
            showNotification('Lỗi khi tạo SEO.');
        } finally {
            setLoading(l => ({...l, seo: false}));
        }
    };
    
    const handleGeneratePrompts = async () => {
        if (!state.step2.script) {
            showNotification('Vui lòng tạo kịch bản ở BƯỚC 2 trước.');
            return;
        }
        setLoading(l => ({...l, prompts: true}));
        try {
            const prompts = await geminiService.generateImagePrompts(state.step2.script, state.step4.numPrompts, state.step1.language, state.step4.style);
            setState(s => ({ ...s, step4: { ...s.step4, prompts } }));
        } catch (error) {
            console.error('Error generating prompts:', error);
            showNotification('Lỗi khi tạo prompt ảnh.');
        } finally {
            setLoading(l => ({...l, prompts: false}));
        }
    };
    
    const handleGenerateThumbnail = async () => {
        if (!state.step1.selectedTitle) {
            showNotification('Vui lòng chọn tiêu đề ở BƯỚC 1 trước.');
            return;
        }
        setLoading(l => ({ ...l, thumbnail: true }));
        try {
            const thumbnail = await geminiService.generateThumbnail(
                state.step1.selectedTitle.title, 
                state.step2.script, 
                state.step5.size, 
                state.step1.language,
                state.step4.style,
                state.step5.file,
                state.step5.useWatermark,
                state.step5.watermarkText
            );
            setState(s => ({ ...s, step5: { ...s.step5, thumbnail } }));
        } catch (error) {
            console.error('Error generating thumbnail:', error);
            showNotification('Lỗi khi tạo thumbnail.');
        } finally {
            setLoading(l => ({...l, thumbnail: false}));
        }
    };
    
    const handleGenerateVoice = async () => {
        if (!state.step2.script) {
            showNotification('Vui lòng tạo kịch bản ở BƯỚC 2 trước.');
            return;
        }
        setLoading(l => ({ ...l, voice: true }));
        try {
            const audioBuffer = await geminiService.generateVoice(state.step2.script, state.step6.voice);
            if(audioBuffer) {
                setState(s => ({ ...s, step6: { ...s.step6, voiceAudio: audioBuffer } }));
            } else {
                 showNotification('Không thể tạo voice.');
            }
        } catch (error) {
            console.error('Error generating voice:', error);
            showNotification('Lỗi khi tạo voice.');
        } finally {
            setLoading(l => ({...l, voice: false}));
        }
    };

    const playVoice = (audioBuffer: AudioBuffer | null) => {
        if (!audioBuffer) return;

        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.start(0);
    };

    const handlePlayDemoVoice = async () => {
        setLoading(l => ({ ...l, voiceDemo: true }));
        try {
            const demoAudioBuffer = await geminiService.generateDemoVoice(state.step6.voice);
            if (demoAudioBuffer) {
                playVoice(demoAudioBuffer);
            } else {
                showNotification('Không thể phát giọng nói mẫu.');
            }
        } catch (error) {
            console.error('Error playing demo voice:', error);
            showNotification('Lỗi khi phát giọng nói mẫu.');
        } finally {
            setLoading(l => ({ ...l, voiceDemo: false }));
        }
    };

    const handleDownloadAll = async () => {
        setLoading(l => ({...l, download: true}));
        try {
            await downloadZip(state, showNotification);
        } catch (error) {
            console.error('Error creating zip file:', error);
            showNotification('Lỗi khi tạo file zip.');
        } finally {
            setLoading(l => ({...l, download: false}));
        }
    };

    const isCustomizationEnabled = state.step1.input.split(/\s+/).filter(Boolean).length > 50;

    return (
        <div className="min-h-screen bg-brand-dark p-4 sm:p-6 lg:p-8 font-sans">
            {notification && (
                <div className="fixed top-5 right-5 bg-green-500 text-white py-2 px-4 rounded-lg shadow-lg z-50 flex items-center animate-fade-in-out">
                    <CheckIcon className="w-5 h-5 mr-2"/>
                    {notification}
                </div>
            )}
            <header className="text-center mb-8">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-white">ND <span className="text-brand-orange">AllS</span></h1>
                <p className="text-gray-400 mt-2 text-lg">Your All-in-One AI Content Creation Suite</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* STEP 1 */}
                <StepCard step={1} title="Chủ đề & Tiêu đề">
                    <textarea
                        className="w-full h-32 bg-brand-gray border border-brand-light-gray rounded-md p-2 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange"
                        placeholder="Nhập nội dung hoặc tải lên file..."
                        value={state.step1.input}
                        onChange={(e) => setState(s => ({ ...s, step1: { ...s.step1, input: e.target.value, file: null } }))}
                    />
                     <label className="mt-2 w-full inline-flex items-center justify-center px-4 py-2 bg-brand-gray text-gray-200 rounded-md cursor-pointer hover:bg-brand-light-gray border border-brand-light-gray">
                        <UploadIcon className="w-5 h-5 mr-2" />
                        <span>{state.step1.file ? state.step1.file.name : 'Tải lên File'}</span>
                        <input type="file" className="hidden" accept=".txt,.md,.docx" onChange={(e) => handleFileChange(e, 1)} />
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
                        <select value={state.step1.language} onChange={(e) => setState(s => ({...s, step1: {...s.step1, language: e.target.value}}))} className="w-full bg-brand-gray border border-brand-light-gray rounded-md p-2 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange">
                            {LANGUAGE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                        <select value={state.step1.topic} onChange={(e) => setState(s => ({...s, step1: {...s.step1, topic: e.target.value}}))} className="w-full bg-brand-gray border border-brand-light-gray rounded-md p-2 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange">
                            {TOPIC_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                        <select value={state.step1.numTitles} onChange={(e) => setState(s => ({...s, step1: {...s.step1, numTitles: parseInt(e.target.value, 10)}}))} className="w-full bg-brand-gray border border-brand-light-gray rounded-md p-2 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange">
                            {NUM_TITLES_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                     <button onClick={handleGenerateTitles} disabled={loading.titles} className="w-full mt-4 flex items-center justify-center bg-brand-orange text-white font-bold py-2 px-4 rounded-md hover:bg-orange-600 disabled:bg-orange-800 disabled:cursor-not-allowed transition-colors">
                        {loading.titles ? <LoadingSpinnerIcon /> : <GenerateIcon />}<span className="ml-2">Tạo Tiêu Đề</span>
                    </button>
                    <div className="mt-4 space-y-2 max-h-60 overflow-y-auto pr-2">
                        {state.step1.titles.map((t, i) => (
                            <div key={i} onClick={() => handleSelectTitle(t)} className={`p-3 rounded-md cursor-pointer transition-all ${state.step1.selectedTitle?.title === t.title ? 'bg-orange-900/50 border-2 border-brand-orange' : 'bg-brand-gray hover:bg-brand-light-gray border-2 border-transparent'}`}>
                                <p className="font-semibold">{t.title}</p>
                                <p className="text-sm text-orange-400">Điểm Trend Youtube: {t.youtubeTrendScore}/100</p>
                            </div>
                        ))}
                    </div>
                </StepCard>

                {/* STEP 2 */}
                <StepCard step={2} title="Nội dung kịch bản">
                    <input type="text" readOnly value={state.step1.selectedTitle?.title || ''} placeholder="Tiêu đề sẽ tự động cập nhật tại đây" className="w-full bg-brand-gray border border-brand-light-gray rounded-md p-2 mb-2 cursor-not-allowed" />
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                         <select value={state.step2.numSections} onChange={(e) => setState(s => ({...s, step2: {...s.step2, numSections: parseInt(e.target.value, 10)}}))} className="w-full bg-brand-gray border border-brand-light-gray rounded-md p-2 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange">
                            {SCRIPT_SECTIONS_OPTIONS.map(opt => <option key={opt} value={opt}>Tổng số phần: {opt}</option>)}
                        </select>
                        <select value={state.step2.wordsPerSection} onChange={(e) => setState(s => ({...s, step2: {...s.step2, wordsPerSection: parseInt(e.target.value, 10)}}))} className="w-full bg-brand-gray border border-brand-light-gray rounded-md p-2 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange">
                           {WORDS_PER_SECTION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt} từ/phần</option>)}
                        </select>
                    </div>
                     <div className="mt-2">
                        <select 
                            value={state.step2.customization} 
                            onChange={(e) => setState(s => ({...s, step2: {...s.step2, customization: e.target.value}}))} 
                            disabled={!isCustomizationEnabled}
                            className="w-full bg-brand-gray border border-brand-light-gray rounded-md p-2 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!isCustomizationEnabled ? "Chức năng này được kích hoạt khi nội dung đầu vào ở BƯỚC 1 > 50 từ." : ""}>
                           {CUSTOMIZATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                        {!isCustomizationEnabled && (
                            <p className="text-xs text-gray-400 mt-1">
                                "Tuỳ Chỉnh" được kích hoạt khi nội dung đầu vào &gt; 50 từ.
                            </p>
                        )}
                    </div>
                     <button onClick={handleGenerateScript} disabled={loading.script || !state.step1.selectedTitle} className="w-full mt-4 flex items-center justify-center bg-brand-orange text-white font-bold py-2 px-4 rounded-md hover:bg-orange-600 disabled:bg-orange-800 disabled:cursor-not-allowed transition-colors">
                        {loading.script ? <LoadingSpinnerIcon /> : <GenerateIcon />}<span className="ml-2">Tạo Nội Dung</span>
                    </button>
                    <div className="mt-4 relative">
                        <textarea readOnly value={state.step2.script} className="w-full h-60 bg-brand-gray border border-brand-light-gray rounded-md p-2 whitespace-pre-wrap" placeholder="Kết quả nội dung kịch bản..."></textarea>
                        {state.step2.script && <CopyButton text={state.step2.script} onCopy={showNotification}/>}
                    </div>
                </StepCard>

                {/* STEP 3 */}
                <StepCard step={3} title="SEO">
                     <button onClick={handleGenerateSeo} disabled={loading.seo || !state.step2.script} className="w-full mb-4 flex items-center justify-center bg-brand-orange text-white font-bold py-2 px-4 rounded-md hover:bg-orange-600 disabled:bg-orange-800 disabled:cursor-not-allowed transition-colors">
                        {loading.seo ? <LoadingSpinnerIcon /> : <GenerateIcon />}<span className="ml-2">Tạo SEO</span>
                    </button>
                    {loading.seo && <div className="text-center p-4">Đang tạo SEO...</div>}
                    {state.step3.seo && (
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-bold text-brand-orange mb-1">Tiêu đề</h4>
                                <div className="relative">
                                    <p className="p-2 bg-brand-gray rounded-md border border-brand-light-gray">{state.step1.selectedTitle?.title}</p>
                                    <CopyButton text={state.step1.selectedTitle?.title || ''} onCopy={showNotification}/>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-bold text-brand-orange mb-1">Mô tả</h4>
                                 <div className="relative">
                                    <p className="p-2 bg-brand-gray rounded-md border border-brand-light-gray h-24 overflow-y-auto">{state.step3.seo.description}</p>
                                    <CopyButton text={state.step3.seo.description} onCopy={showNotification}/>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-bold text-brand-orange mb-1">Hashtags</h4>
                                <div className="relative">
                                    <p className="p-2 bg-brand-gray rounded-md border border-brand-light-gray">{state.step3.seo.hashtags}</p>
                                    <CopyButton text={state.step3.seo.hashtags} onCopy={showNotification}/>
                                </div>
                            </div>
                             <div>
                                <h4 className="font-bold text-brand-orange mb-1">Tags</h4>
                                <div className="relative">
                                    <p className="p-2 bg-brand-gray rounded-md border border-brand-light-gray">{state.step3.seo.tags}</p>
                                    <CopyButton text={state.step3.seo.tags} onCopy={showNotification}/>
                                </div>
                            </div>
                        </div>
                    )}
                </StepCard>
                
                {/* STEP 4 */}
                <StepCard step={4} title="Prompt Ảnh">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                        <div className="flex items-center space-x-2">
                            <label htmlFor="numPrompts" className="flex-shrink-0">Số lượng/phần:</label>
                            <input type="number" id="numPrompts" min="1" max="5" value={state.step4.numPrompts} onChange={(e) => setState(s => ({...s, step4: {...s.step4, numPrompts: parseInt(e.target.value, 10)}}))} className="w-full bg-brand-gray border border-brand-light-gray rounded-md p-2 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange" />
                        </div>
                         <select value={state.step4.style} onChange={(e) => setState(s => ({...s, step4: {...s.step4, style: e.target.value}}))} className="w-full bg-brand-gray border border-brand-light-gray rounded-md p-2 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange">
                            {IMAGE_STYLES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                     <button onClick={handleGeneratePrompts} disabled={loading.prompts || !state.step2.script} className="w-full mt-4 flex items-center justify-center bg-brand-orange text-white font-bold py-2 px-4 rounded-md hover:bg-orange-600 disabled:bg-orange-800 disabled:cursor-not-allowed transition-colors">
                        {loading.prompts ? <LoadingSpinnerIcon /> : <GenerateIcon />}<span className="ml-2">Tạo Prompt</span>
                    </button>
                    <div className="mt-4 space-y-2 max-h-80 overflow-y-auto pr-2">
                        {state.step4.prompts.map((p, i) => (
                            <div key={i} className="relative p-3 bg-brand-gray rounded-md border border-brand-light-gray">
                                <p>{p}</p>
                                <CopyButton text={p} onCopy={showNotification}/>
                            </div>
                        ))}
                    </div>
                </StepCard>
                
                {/* STEP 5 */}
                <StepCard step={5} title="Thumbnail">
                    <label className="w-full inline-flex items-center justify-center px-4 py-2 bg-brand-gray text-gray-200 rounded-md cursor-pointer hover:bg-brand-light-gray border border-brand-light-gray">
                        <UploadIcon className="w-5 h-5 mr-2" />
                        <span>{state.step5.file ? state.step5.file.name : 'Tải ảnh mẫu'}</span>
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 5)} />
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 items-center">
                        <select value={state.step5.size} onChange={(e) => setState(s => ({...s, step5: {...s.step5, size: e.target.value}}))} className="w-full bg-brand-gray border border-brand-light-gray rounded-md p-2 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange h-full">
                            {THUMBNAIL_SIZES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                         <div className="flex items-center space-x-3 bg-brand-gray p-2.5 rounded-md border border-brand-light-gray">
                            <input
                                type="checkbox"
                                id="watermark-check"
                                checked={state.step5.useWatermark}
                                onChange={(e) => setState(s => ({ ...s, step5: { ...s.step5, useWatermark: e.target.checked } }))}
                                className="h-5 w-5 rounded bg-brand-dark border-gray-500 text-brand-orange focus:ring-brand-orange"
                            />
                            <label htmlFor="watermark-check" className="font-medium text-gray-300 flex-shrink-0">Watermark</label>
                            <input
                                type="text"
                                value={state.step5.watermarkText}
                                onChange={(e) => setState(s => ({ ...s, step5: { ...s.step5, watermarkText: e.target.value } }))}
                                placeholder="Nhập text"
                                disabled={!state.step5.useWatermark}
                                className="w-full bg-brand-dark border border-brand-light-gray rounded-md p-1.5 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange transition-all disabled:opacity-50"
                            />
                        </div>
                    </div>
                    <button onClick={handleGenerateThumbnail} disabled={loading.thumbnail || !state.step1.selectedTitle} className="w-full mt-4 flex items-center justify-center bg-brand-orange text-white font-bold py-2 px-4 rounded-md hover:bg-orange-600 disabled:bg-orange-800 disabled:cursor-not-allowed transition-colors">
                        {loading.thumbnail ? <LoadingSpinnerIcon /> : <GenerateIcon />}<span className="ml-2">Tạo Ảnh</span>
                    </button>
                    <div className="mt-4 aspect-video bg-brand-gray rounded-md flex items-center justify-center border border-brand-light-gray">
                        {loading.thumbnail ? <LoadingSpinnerIcon size="lg"/> : state.step5.thumbnail ? <img src={state.step5.thumbnail} alt="Generated Thumbnail" className="w-full h-full object-contain rounded-md" /> : <p className="text-gray-400">Kết quả Thumbnail</p>}
                    </div>
                </StepCard>
                
                {/* STEP 6 */}
                <StepCard step={6} title="Voice">
                     <div className="flex items-center gap-4">
                        <select value={state.step6.voice} onChange={(e) => setState(s => ({...s, step6: {...s.step6, voice: e.target.value}}))} className="w-full bg-brand-gray border border-brand-light-gray rounded-md p-2 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange">
                            {VOICES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                        <button onClick={handlePlayDemoVoice} disabled={loading.voiceDemo} className="w-[160px] flex-shrink-0 flex items-center justify-center bg-gray-500 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-600 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors">
                            {loading.voiceDemo ? <LoadingSpinnerIcon /> : <PlayIcon className="w-5 h-5"/>}<span className="ml-2">Nghe Demo</span>
                        </button>
                    </div>
                    <button onClick={handleGenerateVoice} disabled={loading.voice || !state.step2.script} className="w-full mt-4 flex items-center justify-center bg-brand-orange text-white font-bold py-2 px-4 rounded-md hover:bg-orange-600 disabled:bg-orange-800 disabled:cursor-not-allowed transition-colors">
                            {loading.voice ? <LoadingSpinnerIcon /> : <GenerateIcon />}<span className="ml-2">Tạo Voice</span>
                    </button>
                     {loading.voice && <div className="text-center p-4 mt-2">Đang tạo voice, vui lòng chờ...</div>}
                     {state.step6.voiceAudio && !loading.voice && <div className="text-center p-2 mt-2 text-green-400">Tạo voice thành công! Voice sẽ có trong file ZIP.</div>}
                </StepCard>
            </div>

            {/* STEP 7 */}
            <div className="mt-6">
                <StepCard step={7} title="Tải về">
                    <button onClick={handleDownloadAll} disabled={loading.download} className="w-full flex items-center justify-center bg-green-600 text-white font-bold py-3 px-6 rounded-md hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed transition-colors text-lg">
                       {loading.download ? <LoadingSpinnerIcon /> : <DownloadIcon />}<span className="ml-2">Tải Tất Cả Dữ Liệu (ZIP)</span>
                    </button>
                </StepCard>
            </div>
        </div>
    );
};

export default App;
