'use client';

import { db } from '@/lib/firebase/client';
import { doc, getDoc, setDoc, updateDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export const BASIC_GENERATION_LIMIT = 10;

export const checkAndIncrementUsage = async (userId: string): Promise<boolean> => {
    const userDocRef = doc(db, 'users', userId);
    
    let docSnap;
    try {
        docSnap = await getDoc(userDocRef);
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'get',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        return false;
    }

    if (!docSnap.exists()) {
        const initialData = {
            uid: userId,
            grade: 'BASIC',
            generationCount: 1,
            lastGenerationReset: serverTimestamp(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
        try {
            await setDoc(userDocRef, initialData);
            return true; 
        } catch (error: any) {
            if (error.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: userDocRef.path,
                    operation: 'create',
                    requestResourceData: initialData,
                });
                errorEmitter.emit('permission-error', permissionError);
            }
            return false;
        }
    }

    const userData = docSnap.data();
    const userGrade = userData.grade || 'BASIC';

    if (userGrade !== 'BASIC') {
        return true;
    }

    let { generationCount = 0, lastGenerationReset } = userData;

    const now = new Date();
    const lastResetDate = (lastGenerationReset as Timestamp)?.toDate() || new Date(0);
    
    if (lastResetDate.getMonth() !== now.getMonth() || lastResetDate.getFullYear() !== now.getFullYear()) {
        generationCount = 0;
        lastGenerationReset = serverTimestamp();
        updateDoc(userDocRef, {
            generationCount: 0,
            lastGenerationReset: lastGenerationReset
        }).catch(async (error) => {
             const permissionError = new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'update',
                requestResourceData: { generationCount: 0, lastGenerationReset },
            });
            errorEmitter.emit('permission-error', permissionError);
        });
    }

    if (generationCount >= BASIC_GENERATION_LIMIT) {
        return false;
    }

    updateDoc(userDocRef, {
        generationCount: generationCount + 1,
        lastGenerationReset: lastGenerationReset || serverTimestamp(),
    }).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'update',
            requestResourceData: { generationCount: generationCount + 1 },
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    return true;
};
