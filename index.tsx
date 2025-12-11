import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type, Schema, Part } from "@google/genai";
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Float, Stars, Sparkles as ThreeSparkles } from '@react-three/drei';
import * as THREE from 'three';
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
  ChevronRight,
  Rotate3d,
  Layers,
  Image as ImageIcon,
  MousePointer2,
  Maximize,
  Move,
  Box,
  Focus,
  Terminal,
  Cpu,
  CloudUpload,
  Network
} from 'lucide-react';

// --- CONFIGURATION ---
const ENABLE_3D = false; // Set to true to enable WebGL 3D model generation and interaction

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
    uploadHint: ENABLE_3D ? "Upload photo. AI reconstructs 3D digital twin." : "Upload photo for comprehensive AI analysis.",
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
      temp: "Temp",
      view360: "3D View",
      dragToRotate: "Left: Rotate | Right: Pan | Double Click: Focus | 'R': Reset"
    },
    error: "Could not analyze the images. Please try clear photos of a plant."
  },
  zh: {
    title: "AI 园艺师",
    subtitle: "专业植物诊断与养护系统",
    uploadBtn: "开始诊断",
    uploadHint: ENABLE_3D ? "上传照片，AI 将为您重建 3D 数字孪生模型。" : "上传照片，AI 将为您进行全维分析。",
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
      temp: "温度",
      view360: "3D 视图",
      dragToRotate: "左键旋转 · 右键平移 · 双击聚焦 · R键复位"
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

// --- 3D Components ---

const ProceduralPlant = (props: any) => {
  const group = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.1) * 0.05;
    }
  });

  return (
    <group ref={group} {...props} dispose={null}>
      {/* Stem */}
      <mesh position={[0, 1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.08, 0.12, 2, 16]} />
        <meshStandardMaterial color="#4ade80" roughness={0.6} />
      </mesh>
      
      {/* Leaves - Procedurally arranged */}
      <group position={[0, 0.5, 0]} rotation={[0.5, 0, 0]}>
        <mesh position={[0, 0.5, 0.3]} scale={[0.5, 0.05, 0.8]} castShadow>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial color="#22c55e" roughness={0.4} />
        </mesh>
      </group>
      <group position={[0, 0.8, 0]} rotation={[0.4, 2, 0]}>
         <mesh position={[0, 0.5, 0.3]} scale={[0.45, 0.05, 0.7]} castShadow>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial color="#22c55e" roughness={0.4} />
        </mesh>
      </group>
      <group position={[0, 1.2, 0]} rotation={[0.6, 4, 0]}>
         <mesh position={[0, 0.5, 0.3]} scale={[0.4, 0.05, 0.6]} castShadow>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial color="#16a34a" roughness={0.4} />
        </mesh>
      </group>
       <group position={[0, 1.5, 0]} rotation={[0.3, 5.5, 0]}>
         <mesh position={[0, 0.4, 0.3]} scale={[0.3, 0.05, 0.5]} castShadow>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial color="#4ade80" roughness={0.4} />
        </mesh>
      </group>

      {/* Pot */}
      <mesh position={[0, -0.25, 0]} castShadow receiveShadow>
         <cylinderGeometry args={[0.6, 0.4, 0.8, 32]} />
         <meshStandardMaterial color="#a8a29e" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.16, 0]} rotation={[-Math.PI/2, 0, 0]}>
         <circleGeometry args={[0.55, 32]} />
         <meshStandardMaterial color="#44403c" />
      </mesh>
    </group>
  );
};

const ViewerController = ({ resetTrigger }: { resetTrigger: number }) => {
  const { camera, controls } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (controlsRef.current) {
        controlsRef.current.reset();
    }
  }, [resetTrigger]);

  const handleDoubleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const point = e.point;
    
    if (controlsRef.current) {
        const direction = camera.position.clone().sub(point).normalize();
        const dist = 1.5; 
        const newCamPos = point.clone().add(direction.multiplyScalar(dist));
        
        controlsRef.current.target.copy(point);
        camera.position.copy(newCamPos);
        controlsRef.current.update();
    }
  };

  return (
    <>
      <OrbitControls 
        ref={controlsRef}
        makeDefault 
        enableDamping 
        dampingFactor={0.05} 
        minDistance={0.5}
        maxDistance={8}
        maxPolarAngle={Math.PI / 2 - 0.1} 
      />
      <group onDoubleClick={handleDoubleClick}>
         <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
            <ProceduralPlant />
         </Float>
      </group>
    </>
  );
};

const Plant3DScene = ({ lang }: { lang: Lang }) => {
  const [resetCount, setResetCount] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'r') setResetCount(c => c + 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="w-full h-full relative bg-emerald-950">
      <Canvas shadows camera={{ position: [2, 2, 4], fov: 45 }}>
        <fog attach="fog" args={['#022c22', 5, 15]} />
        <ambientLight intensity={0.5} />
        <spotLight 
          position={[5, 10, 5]} 
          angle={0.5} 
          penumbra={1} 
          intensity={1.5} 
          castShadow 
          shadow-mapSize={[1024, 1024]} 
        />
        <pointLight position={[-5, 5, -5]} intensity={0.5} color="#4ade80" />

        <Suspense fallback={null}>
            <Environment preset="forest" />
            <ViewerController resetTrigger={resetCount} />
            <ContactShadows position={[0, -1, 0]} opacity={0.4} scale={10} blur={2.5} far={4} />
            <ThreeSparkles count={50} scale={3} size={2} speed={0.4} opacity={0.5} color="#4ade80" />
        </Suspense>
      </Canvas>
    </div>
  );
};

// --- Main App Logic ---

const HealthBar = ({ status, risk, lang }: { status: PlantData['healthStatus'], risk: PlantData['riskLevel'], lang: Lang }) => {
  const t = translations[lang];
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

const App = () => {
  const [lang, setLang] = useState<Lang>('zh');
  const [isProcessing, setIsProcessing] = useState(false);
  const [images, setImages] = useState<string[] | null>(null);
  const [data, setData] = useState<PlantData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = translations[lang];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Reset state
    setData(null);
    setIsProcessing(true);

    const promises = Array.from(files).map((file: File) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then(base64Images => {
      setImages(base64Images);
      startSimulationAndAnalysis(base64Images);
    });
    
    e.target.value = '';
  };

  const startSimulationAndAnalysis = async (base64Images: string[]) => {
    setIsProcessing(true);
    
    try {
        const result = await callGemini(base64Images);
        if (result) {
            setData(result);
        }
    } catch (e) {
        console.error(e);
        alert(t.error);
        setImages(null);
    } finally {
        setIsProcessing(false);
    }
  };

  const callGemini = async (base64Images: string[]): Promise<PlantData | null> => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const modelId = 'gemini-2.5-flash';

      const prompt = lang === 'zh' 
        ? `你是一位专业的植物病理学家。分析这些图片。
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
        : `You are an expert plant pathologist. Analyze these images.
           Tasks:
           1. Identify the plant.
           2. Diagnose health, risk level, symptoms, and causes.
           3. Create step-by-step treatment guide.
           4. If sick, list common active chemical ingredients from public registries (generic names only, NO BRANDS).

           Output: JSON format. English text.
           `;

      const imageParts: Part[] = base64Images.map(img => {
        const base64Data = img.split(',')[1];
        const mimeType = img.split(';')[0].split(':')[1];
        return { inlineData: { mimeType, data: base64Data } };
      });

      const response = await ai.models.generateContent({
        model: modelId,
        contents: [ ...imageParts, { text: prompt } ],
        config: {
          responseMimeType: "application/json",
          responseSchema: plantSchema
        }
      });

      const jsonText = response.text;
      if (jsonText) {
        return JSON.parse(jsonText) as PlantData;
      }
      return null;
    } catch (error) {
      throw error;
    } 
  };

  const reset = () => {
    setImages(null);
    setData(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-paper font-sans text-stone-800 overflow-x-hidden selection:bg-emerald-200">
      
      {/* --- Landing / Upload State --- */}
      {!images && (
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
               <div className="pt-10 flex flex-col items-center gap-4">
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
                 <p className="text-white/40 text-sm flex items-center gap-2">
                   <Layers size={14} />
                   {t.uploadHint}
                 </p>
               </div>

               {/* Footer Tagline */}
               <p className="pt-12 text-white/20 text-xs tracking-[0.2em] uppercase font-light">Powered by Gemini 2.5</p>
            </div>
          </main>
        </div>
      )}

      {/* --- Processing State --- */}
      {images && isProcessing && (
        <div className="flex-1 flex flex-col items-center justify-center bg-emerald-950 text-white p-6 relative overflow-hidden">
          <img 
            src={images[0]} 
            className="absolute inset-0 w-full h-full object-cover opacity-20 blur-3xl scale-125 animate-pulse-slow" 
            alt="Background" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 via-emerald-950/60 to-emerald-950/80" />
          
          <div className="relative z-10 flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
             <div className="relative">
                <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-20 animate-pulse" />
                <Loader2 size={48} className="text-emerald-400 animate-spin relative z-10" />
             </div>
             <p className="text-lg font-serif font-medium text-emerald-100/90 tracking-wide animate-pulse">
                {lang === 'zh' ? '正在分析植物特征...' : 'Analyzing plant features...'}
             </p>
          </div>
        </div>
      )}

      {/* --- Result State --- */}
      {images && data && !isProcessing && (
        <div className="flex-1 flex flex-col lg:flex-row h-auto lg:h-screen lg:overflow-hidden animate-in fade-in duration-700">
          
          {/* Left Column: Visuals (Interactive 3D Viewer OR 2D Image) */}
          <div className="lg:w-[45%] xl:w-[40%] relative flex flex-col bg-stone-200 group">
            <div className="relative flex-1 min-h-[50vh] lg:min-h-0 bg-emerald-950">
              
              {ENABLE_3D ? (
                  <>
                      {/* THE 3D SCENE */}
                      <Plant3DScene lang={lang} />
                      
                      {/* Overlay UI for 3D */}
                      <div className="absolute top-6 right-6 pointer-events-none">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 backdrop-blur-md rounded-full text-white text-xs font-bold border border-emerald-400/30 shadow-lg animate-pulse">
                            <Box size={14} />
                            <span>WebGL 3D</span>
                        </div>
                      </div>

                      <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none">
                         <div className="bg-black/60 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/10 text-white/80 text-[10px] uppercase tracking-wider flex items-center gap-4 shadow-xl">
                            <span className="flex items-center gap-1.5"><Rotate3d size={12} /> Rotate</span>
                            <span className="flex items-center gap-1.5"><Move size={12} /> Pan</span>
                            <span className="flex items-center gap-1.5"><MousePointer2 size={12} /> Double-Click Focus</span>
                            <span className="flex items-center gap-1.5"><RefreshCcw size={12} /> 'R' Reset</span>
                         </div>
                      </div>
                  </>
              ) : (
                  <>
                      {/* 2D IMAGE VIEW */}
                      <div className="w-full h-full relative overflow-hidden">
                          <img 
                            src={images[0]} 
                            className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-700 ease-out" 
                            alt="Analyzed Plant"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 via-transparent to-transparent pointer-events-none" />
                      </div>

                       {/* Overlay UI for 2D */}
                      <div className="absolute top-6 right-6 pointer-events-none">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/30 backdrop-blur-md rounded-full text-white text-xs font-bold border border-white/10 shadow-lg">
                            <ImageIcon size={14} />
                            <span>Source Image</span>
                        </div>
                      </div>
                  </>
              )}
              
              {/* Floating Info Card (Common) */}
              <div className="absolute bottom-8 left-6 right-6 lg:bottom-12 lg:left-10 lg:right-10 pointer-events-none">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-2xl text-white shadow-2xl pointer-events-auto">
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
                className="absolute top-6 left-6 p-3 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white transition-all z-20 border border-white/10 group-btn"
              >
                <ArrowRight size={20} className="rotate-180 group-btn-hover:-translate-x-1 transition-transform" />
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
        multiple
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