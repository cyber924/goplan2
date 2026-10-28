
import admin from 'firebase-admin';
import { firebaseConfig } from './config';

let adminDb: admin.firestore.Firestore | null = null;
let adminStorage: admin.storage.Storage | null = null;
let adminAuth: admin.auth.Auth | null = null;

try {
    if (!admin.apps.length) {
        // 서버 측 Admin SDK도 config.ts의 통합 설정을 사용하여 프로젝트 일관성을 유지합니다.
        admin.initializeApp({
            projectId: firebaseConfig.projectId,
            storageBucket: firebaseConfig.storageBucket,
        });
    }
    
    adminDb = admin.firestore();
    adminStorage = admin.storage();
    adminAuth = admin.auth();

} catch (error) {
    console.error('Firebase Admin initialization error:', error);
}

export { adminDb, adminStorage, adminAuth };
