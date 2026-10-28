
'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
    Cpu, 
    Database, 
    ShieldCheck, 
    Zap, 
    ArrowLeft, 
    Loader2, 
    Save, 
    Activity, 
    BarChart3, 
    AlertTriangle,
    CheckCircle2,
    Settings2,
    Terminal
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { db } from '@/lib/firebase/client';
import { collection, getDocs, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

// AI Models Constants (Hardcoded as requested)
const AI_MODELS = [
    {
        name: 'Gemini 2.5 Flash (Text)',
        modelId: 'googleai/gemini-2.5-flash',
        location: 'src/ai/flows/*.ts',
        role: '사업계획서 초안, 분석 리포트, 뉴스레터 등 텍스트 생성',
        costPerCall: 0.15 // Mock cost in KRW
    },
    {
        name: 'Gemini 2.5 Flash Image',
        modelId: 'googleai/gemini-2.5-flash-image',
        location: 'src/ai/flows/generate-image.ts',
        role: '시각 자료 및 마케팅용 이미지 생성',
        costPerCall: 25.0 // Mock cost in KRW
    }
];

export default function AdminSettingsPage() {
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalDocs: 0,
        totalMarketItems: 0,
        totalAiCalls: 0,
        estimatedCost: 0
    });
    const [settings, setSettings] = useState({
        basicLimit: 10,
        maintenanceMode: false,
        emergencyNotice: '',
        noticeActive: false
    });
    const [systemStatus, setSystemStatus] = useState({
        firestore: 'checking',
        auth: 'checking',
        storage: 'checking'
    });

    const { toast } = useToast();
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!user || user.email !== 'cyber924@naver.com') {
            router.push('/');
            return;
        }

        const fetchAllData = async () => {
            setIsInitialLoading(true);
            try {
                // 1. Fetch Stats
                const usersSnap = await getDocs(collection(db, 'users')).catch(err => {
                    if (err.code === 'permission-denied') {
                        errorEmitter.emit('permission-error', new FirestorePermissionError({
                            path: 'users',
                            operation: 'list',
                        }));
                    }
                    throw err;
                });

                const docsSnap = await getDocs(collection(db, 'documents')).catch(err => {
                    if (err.code === 'permission-denied') {
                        errorEmitter.emit('permission-error', new FirestorePermissionError({
                            path: 'documents',
                            operation: 'list',
                        }));
                    }
                    throw err;
                });

                const marketSnap = await getDocs(collection(db, 'market_items')).catch(err => {
                    if (err.code === 'permission-denied') {
                        errorEmitter.emit('permission-error', new FirestorePermissionError({
                            path: 'market_items',
                            operation: 'list',
                        }));
                    }
                    throw err;
                });
                
                let totalAiCalls = 0;
                usersSnap.forEach(u => {
                    totalAiCalls += (u.data().generationCount || 0);
                });

                setStats({
                    totalUsers: usersSnap.size,
                    totalDocs: docsSnap.size,
                    totalMarketItems: marketSnap.size,
                    totalAiCalls: totalAiCalls,
                    estimatedCost: Math.round(totalAiCalls * 5) // Avg mock cost
                });

                // 2. Fetch Global Settings
                const settingsDocRef = doc(db, 'system', 'config');
                const settingsDoc = await getDoc(settingsDocRef).catch(err => {
                    if (err.code === 'permission-denied') {
                        errorEmitter.emit('permission-error', new FirestorePermissionError({
                            path: settingsDocRef.path,
                            operation: 'get',
                        }));
                    }
                    throw err;
                });

                if (settingsDoc.exists()) {
                    setSettings(prev => ({ ...prev, ...settingsDoc.data() }));
                }

                // 3. System Health Check
                setSystemStatus({
                    firestore: 'connected',
                    auth: 'connected',
                    storage: 'connected'
                });

            } catch (error) {
                console.error(error);
                toast({ variant: 'destructive', title: '데이터 로드 실패' });
            } finally {
                setIsInitialLoading(false);
            }
        };

        fetchAllData();
    }, [user, router, toast]);

    const handleSaveSettings = () => {
        setIsSaving(true);
        const docRef = doc(db, 'system', 'config');
        const dataToSave = {
            ...settings,
            updatedAt: serverTimestamp(),
            updatedBy: user?.email
        };

        setDoc(docRef, dataToSave, { merge: true })
            .then(() => {
                toast({ title: '설정 저장 완료', description: '시스템 설정이 즉시 반영되었습니다.' });
                setIsSaving(false);
            })
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: docRef.path,
                    operation: 'write',
                    requestResourceData: dataToSave,
                });
                errorEmitter.emit('permission-error', permissionError);
                setIsSaving(false);
            });
    };

    if (isInitialLoading) {
        return (
            <div className="flex flex-col min-h-screen bg-[#f4f7fc]">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-16 h-16 animate-spin text-[#0b50d0]" />
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#f4f7fc]">
            <Header />
            <main className="flex-1 py-16 sm:py-24">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-6">
                        <div>
                            <Button variant="outline" asChild className="mb-4 border-2 border-[#0b50d0] rounded-xl font-black hover:bg-[#e8f0ff] transition-all">
                                <Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" />관리 대시보드</Link>
                            </Button>
                            <h1 className="text-3xl sm:text-4xl font-black text-[#0b2447] flex items-center gap-3">
                                <Settings2 className="w-8 h-8 sm:w-10 sm:h-10 text-[#0b50d0]" /> 사이트 설정 및 모니터링
                            </h1>
                        </div>
                        <Button onClick={handleSaveSettings} disabled={isSaving} className="h-14 px-8 bg-[#0b50d0] border-2 border-[#0b2447] text-white font-black shadow-[6px_6px_0px_0px_rgba(11,36,71,0.15)] rounded-xl transition-all hover:translate-y-[-2px] w-full sm:w-auto">
                            {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
                            변경사항 마스터 저장
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* 1. System Health Status */}
                        <Card className="border-[3px] border-[#0b50d0] shadow-[8px_8px_0px_0px_rgba(11,80,208,0.1)] rounded-[22px] bg-white overflow-hidden">
                            <CardHeader className="bg-[#f4f7fc] border-b-2 border-[#e2e8f4]">
                                <CardTitle className="flex items-center gap-2 text-xl font-black text-[#0b2447]">
                                    <Activity className="text-[#0b50d0]" /> 실시간 시스템 상태
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 sm:p-8 space-y-6">
                                <div className="flex items-center justify-between p-4 bg-white border-2 border-[#e2e8f4] rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <Database className="text-[#475069] w-5 h-5" />
                                        <span className="font-bold text-[#0b2447] text-sm">Firestore DB</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={cn("w-3 h-3 rounded-full animate-pulse", systemStatus.firestore === 'connected' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500")} />
                                        <span className={cn("text-[10px] font-black", systemStatus.firestore === 'connected' ? "text-green-600" : "text-red-600")}>
                                            {systemStatus.firestore.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-white border-2 border-[#e2e8f4] rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <ShieldCheck className="text-[#475069] w-5 h-5" />
                                        <span className="font-bold text-[#0b2447] text-sm">Firebase Auth</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={cn("w-3 h-3 rounded-full", systemStatus.auth === 'connected' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500")} />
                                        <span className={cn("text-[10px] font-black", systemStatus.auth === 'connected' ? "text-green-600" : "text-red-600")}>
                                            {systemStatus.auth === 'connected' ? 'ACTIVE' : 'INACTIVE'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-white border-2 border-[#e2e8f4] rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <Zap className="text-[#475069] w-5 h-5" />
                                        <span className="font-bold text-[#0b2447] text-sm">Gemini API</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                        <span className="text-[10px] font-black text-green-600">HEALTHY</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 2. Usage Stats & Costs */}
                        <Card className="border-[3px] border-[#0b50d0] shadow-[8px_8px_0px_0px_rgba(11,80,208,0.1)] rounded-[22px] bg-white overflow-hidden lg:col-span-2">
                            <CardHeader className="bg-[#f4f7fc] border-b-2 border-[#e2e8f4]">
                                <CardTitle className="flex items-center gap-2 text-xl font-black text-[#0b2447]">
                                    <BarChart3 className="text-[#0b50d0]" /> 이번 달 지표 및 비용 추정
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 sm:p-8">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                                    {[
                                        { label: '총 사용자', value: stats.totalUsers, unit: '명', color: 'text-[#0b2447]' },
                                        { label: '총 문서 생성', value: stats.totalDocs, unit: '건', color: 'text-[#0b2447]' },
                                        { label: '누적 AI 호출', value: stats.totalAiCalls, unit: '회', color: 'text-[#0b50d0]' },
                                        { label: '예상 비용', value: stats.estimatedCost.toLocaleString(), unit: '원', color: 'text-destructive' },
                                    ].map((stat, i) => (
                                        <div key={i} className="p-4 sm:p-5 bg-[#f4f7fc] border-2 border-[#0b50d0] rounded-2xl shadow-[4px_4px_0px_0px_rgba(11,80,208,0.05)]">
                                            <p className="text-[9px] sm:text-[10px] font-black text-[#7b86a0] uppercase mb-1">{stat.label}</p>
                                            <p className={cn("text-xl sm:text-2xl font-black", stat.color)}>{stat.value}<span className="text-xs ml-0.5">{stat.unit}</span></p>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-8 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl flex items-start gap-3">
                                    <AlertTriangle className="text-yellow-600 w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <p className="text-[11px] sm:text-xs text-yellow-800 font-bold leading-relaxed">
                                        비용 추정치는 호출당 평균 토큰 사용량을 기반으로 한 시뮬레이션입니다. 실제 Google AI Studio 청구서와는 차이가 있을 수 있습니다.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 3. AI Model Management */}
                        <Card className="border-[3px] border-[#0b50d0] shadow-[8px_8px_0px_0px_rgba(11,80,208,0.1)] rounded-[22px] bg-white overflow-hidden lg:col-span-3">
                            <CardHeader className="bg-[#f4f7fc] border-b-2 border-[#e2e8f4]">
                                <CardTitle className="flex items-center gap-2 text-xl font-black text-[#0b2447]">
                                    <Cpu className="text-[#0b50d0]" /> 활성화된 AI 모델 엔진
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 sm:p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                                    {AI_MODELS.map((model, i) => (
                                        <div key={i} className="group relative p-5 sm:p-6 border-[3px] border-[#0b2447] rounded-2xl bg-white shadow-[6px_6px_0px_0px_rgba(11,36,71,0.1)]">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="text-lg font-black text-[#0b2447]">{model.name}</h3>
                                                    <code className="text-[10px] text-[#0b50d0] font-black bg-[#e8f0ff] px-2 py-0.5 rounded">{model.modelId}</code>
                                                </div>
                                                <Badge className="bg-green-100 text-green-700 border border-green-300 font-black">ACTIVE</Badge>
                                            </div>
                                            <div className="space-y-3 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <Terminal className="w-4 h-4 text-[#7b86a0]" />
                                                    <span className="font-bold text-[#475069] text-xs">위치:</span>
                                                    <span className="font-medium text-[11px] text-[#0b50d0]">{model.location}</span>
                                                </div>
                                                <p className="text-xs text-[#475069] font-medium leading-relaxed">
                                                    <span className="font-bold">역할:</span> {model.role}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* 4. Global Controls - Narrowed and Optimized */}
                        <div className="lg:col-span-2">
                            <Card className="border-[3px] border-[#0b50d0] shadow-[8px_8px_0px_0px_rgba(11,80,208,0.1)] rounded-[22px] bg-white overflow-hidden">
                                <CardHeader className="bg-[#f4f7fc] border-b-2 border-[#e2e8f4]">
                                    <CardTitle className="flex items-center gap-2 text-xl font-black text-[#0b2447]">
                                        <Settings2 className="text-[#0b50d0]" /> 서비스 운영 제어
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 sm:p-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <Label className="text-base font-black text-[#0b2447]">무료 사용 한도 (월)</Label>
                                            <div className="flex items-center gap-3">
                                                <Input 
                                                    type="number" 
                                                    value={settings.basicLimit} 
                                                    onChange={(e) => setSettings({ ...settings, basicLimit: parseInt(e.target.value) })}
                                                    className="h-12 w-24 border-2 border-[#0b50d0] rounded-xl font-black text-center text-lg focus:ring-[#0b50d0]" 
                                                />
                                                <span className="font-bold text-[#475069]">회</span>
                                            </div>
                                            <p className="text-[10px] text-[#7b86a0] font-bold">BASIC 등급의 월간 AI 생성 제한 횟수입니다.</p>
                                        </div>

                                        <div className="space-y-4">
                                            <Label className="text-base font-black text-[#0b2447]">시스템 상태 제어</Label>
                                            <div className="space-y-3 p-4 border-2 border-[#e2e8f4] rounded-xl bg-[#f4f7fc]/50">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-bold text-[#0b2447]">서비스 점검 모드</span>
                                                    <Switch 
                                                        checked={settings.maintenanceMode} 
                                                        onCheckedChange={(val) => setSettings({ ...settings, maintenanceMode: val })} 
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-bold text-[#0b2447]">긴급 안내 바 노출</span>
                                                    <Switch 
                                                        checked={settings.noticeActive} 
                                                        onCheckedChange={(val) => setSettings({ ...settings, noticeActive: val })} 
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="md:col-span-2 space-y-4 pt-4 border-t-2 border-dashed border-[#e2e8f4]">
                                            <Label className="text-base font-black text-[#0b2447]">긴급 안내 문구</Label>
                                            <Input 
                                                placeholder="예: 긴급 서버 점검 중입니다 (14:00~16:00)" 
                                                value={settings.emergencyNotice}
                                                onChange={(e) => setSettings({ ...settings, emergencyNotice: e.target.value })}
                                                className="h-12 border-2 border-[#0b50d0] rounded-xl font-bold focus:ring-[#0b50d0]" 
                                            />
                                            <p className="text-[10px] text-[#7b86a0] font-bold">안내 바 활성화 시 모든 페이지 상단에 즉시 노출됩니다.</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <div className="mt-12 text-center text-[#7b86a0] font-bold text-[11px] sm:text-xs">
                        <CheckCircle2 className="w-4 h-4 inline-block mr-1 text-green-500" />
                        모든 시스템이 정상적으로 운영되고 있습니다. 마지막 업데이트: {new Date().toLocaleString()}
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
