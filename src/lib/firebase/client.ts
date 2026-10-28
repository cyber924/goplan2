
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { initializeFirestore, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { firebaseConfig } from "./config";

// 앱 초기화 (싱글톤 패턴: 설정 통합본 사용)
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 서비스 인스턴스 생성
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// 브라우저 로컬 저장소에 인증 상태 유지 설정
if (typeof window !== 'undefined') {
    setPersistence(auth, browserLocalPersistence);
}

export { app, auth, db, storage };
