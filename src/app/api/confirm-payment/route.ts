
import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc } from 'firebase/firestore';
import { adminDb } from '@/lib/firebase/server';

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || "test_sk_Poxy1XQL8RbbYjogWBAk87nO5Wml";

// This function handles both GET and POST requests to provide flexibility
async function handleRequest(request: NextRequest) {
    if (!adminDb) {
        return NextResponse.json({ success: false, message: '서버 오류: 데이터베이스에 연결할 수 없습니다.' }, { status: 500 });
    }

    let paymentKey, orderId, amount;

    if (request.method === 'GET') {
        const { searchParams } = new URL(request.url);
        paymentKey = searchParams.get('paymentKey');
        orderId = searchParams.get('orderId');
        amount = searchParams.get('amount');
    } else if (request.method === 'POST') {
        const body = await request.json();
        paymentKey = body.paymentKey;
        orderId = body.orderId;
        amount = body.amount;
    }

    if (!paymentKey || !orderId || !amount) {
        return NextResponse.json({ success: false, message: '필수 결제 정보가 누락되었습니다.' }, { status: 400 });
    }

    try {
        // 1. 토스페이먼츠에 최종 결제 승인 요청
        const url = 'https://api.tosspayments.com/v1/payments/confirm';
        const basicToken = Buffer.from(`${TOSS_SECRET_KEY}:`).toString('base64');

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${basicToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                paymentKey,
                orderId,
                amount: Number(amount),
            }),
        });

        const paymentData = await response.json();

        if (!response.ok) {
            throw new Error(paymentData.message || '결제 승인에 실패했습니다.');
        }
        
        // 2. 결제 승인 성공 시, 사용자 등급 업데이트
        const userId = orderId.split('_')[0]; // orderId에서 userId 추출
        const userDocRef = doc(adminDb, 'users', userId);
        
        let newGrade = 'PREMIUM'; // 기본값
        if (paymentData.orderName.includes('VIP')) {
            newGrade = 'VIP';
        }
        
        await updateDoc(userDocRef, { grade: newGrade });

        // 3. 결제 성공 페이지로 리디렉션 (GET 요청의 경우) 또는 성공 응답 (POST 요청의 경우)
        if (request.method === 'GET') {
            const successRedirectUrl = new URL('/my-profile', request.url);
            successRedirectUrl.searchParams.set('payment_success', 'true');
            return NextResponse.redirect(successRedirectUrl);
        } else {
             return NextResponse.json({ success: true, message: '결제가 성공적으로 처리되었습니다.' });
        }
        
    } catch (error: any) {
        console.error('Payment confirmation error:', error);
        if (request.method === 'GET') {
            const failRedirectUrl = new URL('/pricing', request.url);
            failRedirectUrl.searchParams.set('payment_fail', error.message || 'true');
            return NextResponse.redirect(failRedirectUrl);
        } else {
            return NextResponse.json({ success: false, message: error.message || '결제 처리 중 오류가 발생했습니다.' }, { status: 500 });
        }
    }
}

export async function GET(request: NextRequest) {
    return handleRequest(request);
}

export async function POST(request: NextRequest) {
    return handleRequest(request);
}
