import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { 
  Sprout, 
  Camera, 
  Upload, 
  Loader2, 
  X, 
  Sun, 
  Droplets, 
  Thermometer, 
  Shovel, 
  Languages,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  RefreshCcw,
  ArrowRight,
  Leaf,
  ShieldAlert,
  Activity,
  Stethoscope,
  FlaskConical,
  Clock,
  ChevronRight
} from 'lucide-react';

// --- Types & Translations ---
type Lang = 'zh' | 'en';

interface PlantData {
  name: string;
  scientificName: string;
  healthStatus: 'Healthy' | 'Needs Attention' | 'Sick' | 'Unknown';
  riskLevel: 'Low' | 'Medium' | 'High';
  symptoms: string[];
  causes: string[];
  urgency: 'Low' | 'Medium' | 'High';
  care: {
    light: string;
    water: string;
    soil: string;
    temp: string;
  };
  diagnosisSteps: string[];
  treatmentIngredients: string[]; // Chemical ingredients only, no brands
  funFact: string;
}

const translations = {
  en: {
    title: "AI Botanist",
    subtitle: "Professional Plant Care & Diagnosis",
    uploadBtn: "Analyze Plant",
    analyzing: "Analyzing specimen...",
    analyzingSub: "Identifying species and pathology...",
    reupload: "New Diagnosis",
    health: {
      Healthy: "Healthy",
      "Needs Attention": "Needs Care",
      Sick: "Sick",
      Unknown: "Unknown"
    },
    risk: {
      Low: "Low Risk",
      Medium: "Medium Risk",
      High: "High Risk"
    },
    urgency: {
      Low: "Observation Needed",
      Medium: "Action Required",
      High: "Urgent Action"
    },
    labels: {
      symptoms: "Symptoms",
      causes: "Causes",
      urgency: "Urgency",
      care: "Care Guide",
      diagnosis: "Treatment Plan",
      treatment: "Registered Active Ingredients",
      disclaimer: "Reference only. Not a prescription. Follow local agricultural regulations.",
      light: "Light",
      water: "Water",
      soil: "Soil",
      temp: "Temp"
    },
    error: "Could not analyze the image. Please try a clear photo of a plant."
  },
  zh: {
    title: "AI 园艺师",
    subtitle: "专业植物诊断与养护系统",
    uploadBtn: "开始诊断",
    analyzing: "正在全维分析...",
    analyzingSub: "识别品种 · 病理分析 · 用药参考",
    reupload: "新的诊断",
    health: {
      Healthy: "健康",
      "Needs Attention": "需关注",
      Sick: "确诊病害",
      Unknown: "未知对象"
    },
    risk: {
      Low: "低风险",
      Medium: "中风险",
      High: "高风险"
    },
    urgency: {
      Low: "建议观察",
      Medium: "需干预",
      High: "紧急"
    },
    labels: {
      symptoms: "症状特征",
      causes: "可能诱因",
      urgency: "紧急程度",
      care: "养护环境",
      diagnosis: "诊断与处理",
      treatment: "登记药剂成分 (仅供参考)",
      disclaimer: "数据基于公开名录，不构成处方。请阅读产品标签并遵循专业指导。",
      light: "光照",
      water: "浇水",
      soil: "土壤",
      temp: "温度"
    },
    error: "无法分析该图片。请上传清晰的植物照片。"
  }
};

// --- Schema Definition ---
const plantSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "Common name of the plant" },
    scientificName: { type: Type.STRING, description: "Scientific Latin name" },
    healthStatus: { 
      type: Type.STRING, 
      enum: ["Healthy", "Needs Attention", "Sick", "Unknown"],
      description: "General health assessment"
    },
    riskLevel: {
      type: Type.STRING,
      enum: ["Low", "Medium", "High"],
      description: "Risk assessment based on health status"
    },
    symptoms: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of visible symptoms (e.g. yellow leaves, black spots). Max 3."
    },
    causes: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of possible causes (e.g. fungal infection, overwatering). Max 3."
    },
    urgency: {
      type: Type.STRING,
      enum: ["Low", "Medium", "High"],
      description: "Urgency of intervention"
    },
    care: {
      type: Type.OBJECT,
      properties: {
        light: { type: Type.STRING, description: "Light requirements (concise)" },
        water: { type: Type.STRING, description: "Watering frequency (concise)" },
        soil: { type: Type.STRING, description: "Soil type (concise)" },
        temp: { type: Type.STRING, description: "Ideal temperature range" }
      },
      required: ["light", "water", "soil", "temp"]
    },
    diagnosisSteps: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Step-by-step guide to treat the plant. 3-5 steps."
    },
    treatmentIngredients: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of chemical ingredients (generic names ONLY, NO BRANDS) found in public agricultural registries suitable for this condition. If healthy, leave empty."
    },
    funFact: { type: Type.STRING, description: "An interesting fact." }
  },
  required: ["name", "scientificName", "healthStatus", "riskLevel", "symptoms", "causes", "urgency", "care", "diagnosisSteps", "treatmentIngredients", "funFact"]
};

// --- Components ---

const HealthBar = ({ status, risk, lang }: { status: PlantData['healthStatus'], risk: PlantData['riskLevel'], lang: Lang }) => {
  const t = translations[lang];
  
  // Color logic
  let gradient = "from-emerald-400 to-emerald-600";
  let width = "100%";
  let shadowColor = "shadow-emerald-500/30";
  
  if (status === 'Needs Attention') {
    gradient = "from-amber-400 to-orange-500";
    width = "66%";
    shadowColor = "shadow-orange-500/30";
  } else if (status === 'Sick') {
    gradient = "from-rose-500 to-red-600";
    width = "33%";
    shadowColor = "shadow-red-500/30";
  } else if (status === 'Unknown') {
    gradient = "from-stone-400 to-stone-500";
    width = "0%";
    shadowColor = "shadow-stone-500/30";
  }

  // Badge logic
  let badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (risk === 'Medium') badgeColor = "bg-amber-100 text-amber-800 border-amber-200";
  if (risk === 'High') badgeColor = "bg-rose-100 text-rose-800 border-rose-200";

  return (
    <div className="flex flex-col w-full gap-3 p-4 rounded-xl bg-white/60 backdrop-blur-md border border-white/40 shadow-sm">
      <div className="flex justify-between items-center">
        <span className="text-sm font-serif font-semibold text-stone-700">{t.health[status]}</span>
        <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide border ${badgeColor}`}>
          {t.risk[risk]}
        </div>
      </div>
      <div className="h-2.5 w-full bg-stone-200/50 rounded-full overflow-hidden backdrop-blur-sm">
        <div 
          className={`h-full bg-gradient-to-r ${gradient} shadow-[0_0_10px_rgba(0,0,0,0.2)] ${shadowColor} transition-all duration-1000 ease-out rounded-full`} 
          style={{ width }}
        />
      </div>
    </div>
  );
};

const CareItem = ({ icon, label, value, bgClass }: { icon: React.ReactNode, label: string, value: string, bgClass: string }) => (
  <div className={`flex flex-col justify-between gap-3 p-5 rounded-2xl border border-transparent hover:border-black/5 transition-all duration-300 ${bgClass} group`}>
    <div className="flex items-center gap-2.5 text-stone-500 group-hover:text-stone-800 transition-colors">
      <div className="p-2 bg-white/60 rounded-full shadow-sm">
        {icon}
      </div>
      <span className="text-[11px] uppercase tracking-widest font-bold opacity-70">{label}</span>
    </div>
    <span className="text-[15px] text-stone-800 font-medium leading-relaxed font-serif tracking-wide">{value}</span>
  </div>
);

const StepItem: React.FC<{ number: number; text: string; isLast: boolean }> = ({ number, text, isLast }) => (
  <div className="flex gap-6 relative group">
    {/* Timeline Line */}
    {!isLast && (
      <div className="absolute left-[19px] top-10 bottom-[-24px] w-[2px] bg-stone-100 group-hover:bg-emerald-100 transition-colors" />
    )}
    
    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-serif font-bold text-lg border-2 border-emerald-100 shadow-sm z-10 group-hover:scale-110 transition-transform duration-300">
      {number}
    </div>
    <div className="pt-1.5 pb-6">
      <p className="text-[15px] text-stone-700 leading-relaxed font-medium">{text}</p>
    </div>
  </div>
);

// --- Main App ---

const App = () => {
  const [lang, setLang] = useState<Lang>('zh');
  const [analyzing, setAnalyzing] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [data, setData] = useState<PlantData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = translations[lang];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setImage(result);
      analyzePlant(result);
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset
  };

  const analyzePlant = async (base64Image: string) => {
    setAnalyzing(true);
    setData(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const modelId = 'gemini-2.5-flash';

      const base64Data = base64Image.split(',')[1];
      const mimeType = base64Image.split(';')[0].split(':')[1];

      const prompt = lang === 'zh' 
        ? `你是一位专业的植物病理学家。分析这张图片。
           任务：
           1. 识别植物。
           2. 诊断健康状况、风险等级、具体症状和病因。
           3. 制定结构化的处理步骤。
           4. 如果有病害，列出 **公开农业登记名录中** 常见的有效化学成分（如多菌灵、代森锰锌等），**严禁推荐具体品牌**。
           
           输出要求：
           - 严格遵循 JSON 格式。
           - 所有文本字段必须使用简体中文。
           - healthStatus, riskLevel, urgency 使用英文枚举值。
           `
        : `You are an expert plant pathologist. Analyze this image.
           Tasks:
           1. Identify the plant.
           2. Diagnose health, risk level, symptoms, and causes.
           3. Create step-by-step treatment guide.
           4. If sick, list common active chemical ingredients from public registries (generic names only, NO BRANDS).

           Output: JSON format. English text.
           `;

      const response = await ai.models.generateContent({
        model: modelId,
        contents: {
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: plantSchema
        }
      });

      const jsonText = response.text;
      if (jsonText) {
        const parsedData = JSON.parse(jsonText) as PlantData;
        setData(parsedData);
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      alert(t.error);
      setImage(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    setImage(null);
    setData(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-paper font-sans text-stone-800 overflow-x-hidden selection:bg-emerald-200">
      
      {/* --- Landing / Upload State --- */}
      {!image && (
        <div className="flex-1 flex flex-col relative overflow-hidden bg-emerald-950">
           {/* Animated Background Mesh */}
           <div className="absolute inset-0 z-0 opacity-40">
              <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-emerald-600/30 rounded-full blur-[120px] animate-pulse" />
              <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-teal-500/20 rounded-full blur-[100px]" />
              <div className="absolute top-[40%] left-[40%] w-[40%] h-[40%] bg-lime-500/10 rounded-full blur-[80px]" />
           </div>

          {/* Header */}
          <header className="relative p-6 md:p-8 flex justify-between items-center z-10">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur-md p-2.5 rounded-xl border border-white/10 shadow-lg">
                <Sprout size={20} className="text-emerald-300" />
              </div>
              <span className="font-serif font-bold text-white/90 tracking-wider text-lg">{t.title}</span>
            </div>
            <button 
              onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-full text-xs font-medium text-emerald-100 border border-white/10 flex items-center gap-2 transition-all"
            >
              <Languages size={14} />
              {lang === 'zh' ? 'English' : '中文'}
            </button>
          </header>

          <main className="flex-1 flex flex-col items-center justify-center p-6 text-center relative z-10">
            <div className="space-y-8 max-w-2xl mx-auto animate-in fade-in zoom-in duration-1000">
               {/* Hero Text */}
               <div className="space-y-4">
                 <h1 className="text-5xl md:text-7xl font-serif font-medium text-white/95 tracking-tight leading-[1.1] drop-shadow-2xl">
                   {lang === 'zh' ? <>植物<span className="text-emerald-400 italic">全维</span>诊断</> : <>Botanical <span className="text-emerald-400 italic">Insight</span></>}
                 </h1>
                 <p className="text-emerald-100/60 text-lg md:text-xl font-light tracking-wide max-w-lg mx-auto">
                   {t.subtitle}
                 </p>
               </div>
               
               {/* Action Button */}
               <div className="pt-10">
                 <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative inline-flex items-center gap-4 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 px-10 py-5 rounded-full shadow-[0_0_40px_rgba(16,185,129,0.4)] hover:shadow-[0_0_60px_rgba(52,211,153,0.6)] transition-all duration-500 transform hover:-translate-y-1"
                 >
                   <span className="bg-emerald-900/10 p-2 rounded-full">
                    <Camera size={24} className="text-emerald-950" />
                   </span>
                   <span className="font-serif font-bold text-lg tracking-wide">{t.uploadBtn}</span>
                   <div className="absolute inset-0 rounded-full border border-white/20 scale-105 opacity-0 group-hover:opacity-100 transition-all duration-500" />
                 </button>
               </div>

               {/* Footer Tagline */}
               <p className="pt-12 text-white/20 text-xs tracking-[0.2em] uppercase font-light">Powered by Gemini 2.5</p>
            </div>
          </main>
        </div>
      )}

      {/* --- Analyzing State --- */}
      {image && analyzing && (
        <div className="flex-1 flex flex-col items-center justify-center bg-emerald-950 text-white p-6 relative overflow-hidden">
          <img 
            src={image} 
            className="absolute inset-0 w-full h-full object-cover opacity-20 blur-2xl scale-110" 
            alt="Background" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/80 to-transparent" />
          
          <div className="relative z-10 flex flex-col items-center max-w-sm text-center">
            <div className="relative mb-10">
              <div className="w-32 h-32 rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(16,185,129,0.2)] bg-black/20 backdrop-blur-sm relative z-10">
                <img src={image} className="w-full h-full object-cover opacity-80" alt="Analyzing" />
              </div>
              {/* Scanning Lines */}
              <div className="absolute -inset-6 border border-emerald-500/20 rounded-[2.5rem] animate-[spin_4s_linear_infinite]" />
              <div className="absolute -inset-6 border border-emerald-500/20 rounded-[2.5rem] rotate-45 animate-[spin_6s_linear_infinite_reverse]" />
            </div>
            
            <div className="space-y-3">
              <h2 className="text-3xl font-serif font-medium tracking-wide">{t.analyzing}</h2>
              <div className="flex items-center justify-center gap-2 text-emerald-400/80 text-sm font-medium animate-pulse">
                <Loader2 size={14} className="animate-spin" />
                <span>{t.analyzingSub}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Result State --- */}
      {image && data && !analyzing && (
        <div className="flex-1 flex flex-col lg:flex-row h-auto lg:h-screen lg:overflow-hidden animate-in fade-in duration-700">
          
          {/* Left Column: Visuals */}
          <div className="lg:w-[45%] xl:w-[40%] relative flex flex-col bg-stone-200">
            {/* Image */}
            <div className="relative flex-1 min-h-[50vh] lg:min-h-0">
              <img src={image} className="w-full h-full object-cover" alt={data.name} />
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-transparent to-black/10" />
              
              {/* Floating Info Card */}
              <div className="absolute bottom-8 left-6 right-6 lg:bottom-12 lg:left-10 lg:right-10">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-2xl text-white shadow-2xl">
                  <div className="flex items-center gap-2 mb-3 text-emerald-300">
                    <Sparkles size={16} />
                    <span className="text-xs font-bold tracking-[0.15em] uppercase">{data.scientificName}</span>
                  </div>
                  <h1 className="text-4xl lg:text-5xl font-serif font-medium mb-6 leading-tight text-white shadow-black/10 drop-shadow-lg">{data.name}</h1>
                  
                  <HealthBar status={data.healthStatus} risk={data.riskLevel} lang={lang} />
                </div>
              </div>

              {/* Back Button */}
              <button 
                onClick={reset}
                className="absolute top-6 left-6 p-3 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white transition-all z-20 border border-white/10 group"
              >
                <ArrowRight size={20} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Right Column: Diagnosis Journal */}
          <div className="lg:w-[55%] xl:w-[60%] bg-paper lg:overflow-y-auto">
            <div className="p-6 md:p-12 max-w-4xl mx-auto space-y-12">
              
              {/* 1. Diagnosis Summary Cards */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Symptoms & Causes Combined Card */}
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
                  
                  {/* Symptoms */}
                  <div>
                    <h3 className="flex items-center gap-2 text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">
                      <Activity size={14} className="text-rose-400" /> {t.labels.symptoms}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {data.symptoms.map((s, i) => (
                        <span key={i} className="px-3 py-1.5 bg-rose-50 text-rose-900 text-[13px] font-medium rounded-lg border border-rose-100/50">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="h-px w-full bg-stone-100" />

                  {/* Causes */}
                  <div>
                    <h3 className="flex items-center gap-2 text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">
                      <FlaskConical size={14} className="text-amber-400" /> {t.labels.causes}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {data.causes.map((c, i) => (
                        <span key={i} className="px-3 py-1.5 bg-stone-50 text-stone-700 text-[13px] font-medium rounded-lg border border-stone-200/50">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Urgency & Fun Fact */}
                <div className="flex flex-col gap-6">
                   <div className={`flex-1 rounded-2xl p-6 border flex flex-col justify-center items-start gap-3
                     ${data.urgency === 'High' ? 'bg-rose-50 border-rose-100' : 
                       data.urgency === 'Medium' ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'}`}>
                       <h3 className="flex items-center gap-2 text-xs font-bold opacity-60 uppercase tracking-widest">
                        <Clock size={14} /> {t.labels.urgency}
                      </h3>
                      <span className={`text-2xl font-serif font-bold 
                        ${data.urgency === 'High' ? 'text-rose-800' : 
                          data.urgency === 'Medium' ? 'text-amber-800' : 'text-emerald-800'}`}>
                        {t.urgency[data.urgency]}
                      </span>
                   </div>
                   
                   <div className="flex-1 bg-stone-800 text-stone-300 p-6 rounded-2xl relative overflow-hidden">
                      <div className="relative z-10">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-2">Did You Know?</h3>
                        <p className="text-sm font-serif italic leading-relaxed text-stone-200">"{data.funFact}"</p>
                      </div>
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                         <Leaf size={60} />
                      </div>
                   </div>
                </div>
              </section>

              {/* 2. Care Environment Grid */}
              <section>
                 <div className="flex items-center gap-4 mb-6">
                    <h3 className="text-lg font-serif font-bold text-stone-800">{t.labels.care}</h3>
                    <div className="h-px flex-1 bg-stone-200" />
                 </div>
                 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <CareItem 
                      icon={<Sun size={18} className="text-amber-500" />} 
                      label={t.labels.light} 
                      value={data.care.light} 
                      bgClass="bg-amber-50/50 hover:bg-amber-50"
                    />
                    <CareItem 
                      icon={<Droplets size={18} className="text-blue-500" />} 
                      label={t.labels.water} 
                      value={data.care.water} 
                      bgClass="bg-blue-50/50 hover:bg-blue-50"
                    />
                    <CareItem 
                      icon={<Thermometer size={18} className="text-rose-500" />} 
                      label={t.labels.temp} 
                      value={data.care.temp} 
                      bgClass="bg-rose-50/50 hover:bg-rose-50"
                    />
                    <CareItem 
                      icon={<Shovel size={18} className="text-stone-600" />} 
                      label={t.labels.soil} 
                      value={data.care.soil} 
                      bgClass="bg-stone-100/50 hover:bg-stone-100"
                    />
                  </div>
              </section>

              {/* 3. Diagnosis Timeline */}
              <section className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-stone-100">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Stethoscope size={20} className="text-emerald-700" />
                  </div>
                  <h3 className="text-xl font-serif font-bold text-stone-800">{t.labels.diagnosis}</h3>
                </div>
                
                <div className="pl-2">
                  {data.diagnosisSteps.map((step, i) => (
                    <StepItem 
                      key={i} 
                      number={i + 1} 
                      text={step} 
                      isLast={i === data.diagnosisSteps.length - 1} 
                    />
                  ))}
                </div>
              </section>

              {/* 4. Compliance Medication (Reference) */}
              {data.treatmentIngredients.length > 0 && (
                <section className="rounded-2xl border border-stone-200 bg-stone-50 overflow-hidden">
                  <div className="p-4 border-b border-stone-200 bg-stone-100/50 flex items-center justify-between">
                     <h3 className="flex items-center gap-2 text-xs font-bold text-stone-600 uppercase tracking-widest">
                      <ShieldAlert size={14} /> {t.labels.treatment}
                    </h3>
                  </div>
                  
                  <div className="p-6">
                    <div className="flex flex-wrap gap-3 mb-5">
                      {data.treatmentIngredients.map((ing, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-white text-stone-700 text-sm font-serif font-medium rounded border border-stone-200 shadow-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {ing}
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3 items-start bg-amber-50 p-4 rounded-xl text-xs text-amber-800/80 leading-relaxed border border-amber-100">
                      <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="font-medium">{t.labels.disclaimer}</p>
                    </div>
                  </div>
                </section>
              )}

              {/* Mobile Footer Spacing */}
              <div className="h-12 lg:hidden" />
              
            </div>
          </div>
        </div>
      )}

      {/* Hidden Input */}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleImageUpload}
      />
    </div>
  );
};

const root = createRoot(document.getElementById('app')!);
root.render(<App />);