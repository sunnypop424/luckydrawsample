// src/components/DrawPage.jsx
import React, { useEffect, useState } from 'react';
import useDrawStore from '../store/useDrawStore';
import ResultReveal from './ResultReveal';
import './css/draw.css';
import { Plus, Minus } from 'lucide-react';
import { getAuth, onAuthStateChanged, getIdTokenResult } from 'firebase/auth';
import Confetti from 'react-confetti';

function DrawPage() {
    const {
        prizes,
        isClosed,
        isTestMode,
        loadFromFirebase,
        updatePrize,
        saveToFirebase,
    } = useDrawStore();

    const [isLoading, setIsLoading] = useState(true);
    const [drawCount, setDrawCount] = useState(1);
    const [results, setResults] = useState([]);
    const [showResult, setShowResult] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            await loadFromFirebase();
            setIsLoading(false);
        };
        fetchData();
    }, [loadFromFirebase]);

    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const token = await getIdTokenResult(user);
                setIsAdmin(token.claims.isAdmin === true);
            } else {
                setIsAdmin(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const totalRemaining = prizes.reduce((sum, p) => sum + p.remaining, 0);
    const isFinished = totalRemaining === 0;
    const isUnavailable = isFinished || isClosed;

    // 1 / 5 / 10 프리셋
    const handlePresetClick = (value) => {
        const safeValue = typeof value === 'number' ? value : 1;
        setDrawCount(Math.max(1, Math.min(100, safeValue)));
    };

    const buildDrawPool = () => {
        const pool = [];
        prizes.forEach((prize) => {
            for (let i = 0; i < prize.remaining; i++) {
                pool.push(prize.rank);
            }
        });
        return pool;
    };

    const getPrizeByRank = (rank) => prizes.find((p) => p.rank === rank);

    const draw = () => {
        const pool = buildDrawPool();

        if (pool.length < drawCount) {
            alert('남은 상품 수량보다 더 많이 뽑을 수 없습니다!');
            return;
        }

        const drawnRanks = [];
        const updatedPrizes = [...prizes];

        for (let i = 0; i < drawCount; i++) {
            const randomIndex = Math.floor(Math.random() * pool.length);
            const selectedRank = pool[randomIndex];
            drawnRanks.push(selectedRank);
            const firstIndex = pool.indexOf(selectedRank);
            pool.splice(firstIndex, 1);

            // 🔹 실제 운영 모드일 때만 재고 차감
            if (!isTestMode) {
                const target = updatedPrizes.find((p) => p.rank === selectedRank);
                if (target) {
                    target.remaining -= 1;
                }
            }
        }

        // 🔹 실제 운영 모드일 때만 Firestore 반영
        if (!isTestMode) {
            updatedPrizes.forEach((p, index) => {
                updatePrize(index, {
                    ...prizes[index],
                    remaining: p.remaining,
                });
            });
            saveToFirebase();
        }

        const fullResults = drawnRanks.map((rank) => {
            const prize = getPrizeByRank(rank);
            return {
                rank,
                name: prize.name,
                requiresShipping: prize.requiresShipping || false,
            };
        });

        setResults(fullResults);
        setShowResult(true);
    };

    const reset = () => {
        setShowConfetti(false);
        setShowResult(false);
        setResults([]);
        setDrawCount(1);
    };

    return (
        <div className="draw gradient1">
            {showConfetti && (
                <Confetti
                    className="no-capture confetti-canvas"
                    numberOfPieces={120}
                    gravity={0.3}
                />
            )}

            <h1>Lucky Draw</h1>
            <p>테스트 관리자 계정 admin@luckydtest.com / admin1234</p>
            <p>디자인은 주신 자료를 활용해 최대한 컨셉과 어울리게 맞춰드립니다.</p>
            <p>드로우 아래쪽에 흐리게 있는 '관리자로 로그인 / 관리자 페이지로 이동'을 통해 로그인 및 관리자 페이지를 체험하세요.</p>
            
            <div className="copy no-capture">
                Copyright 2025. Dingdongsun. All rights reserved.
            </div>

            {/* 리허설 모드 배너 */}
            {isTestMode && !isUnavailable && (
                <div className="test-mode-banner no-capture" style={{marginTop: 26}}>
                    현재 <strong>리허설 모드</strong>입니다. 추첨을 해도 실제 재고는
                    차감되지 않습니다.
                </div>
            )}

            <div className="draw-wrapper">

                {isLoading ? (
                    <div></div>
                ) : showResult ? (
                    <ResultReveal
                        results={results}
                        onFinish={reset}
                        onHighRankReveal={() => setShowConfetti(true)}
                    />
                ) : (
                    <div className="draw-contents">

                        {isUnavailable ? (
                            <div>럭키드로우가 마감되었습니다.</div>
                        ) : (
                            <>
                                {totalRemaining <= 50 && (
                                    <div className="remaining-warning">
                                        럭키 드로우가 {totalRemaining}개 남았습니다.
                                    </div>
                                )}

                                {/* 1줄: 카운트 컨트롤 */}
                                <div className="draw-row">
                                    <div className="draw-count-control">
                                        <button
                                            className="minus"
                                            onClick={() =>
                                                setDrawCount((prev) =>
                                                    Math.max(1, prev - 1)
                                                )
                                            }
                                        >
                                            <Minus />
                                        </button>
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            value={drawCount}
                                            onChange={(e) =>
                                                setDrawCount(
                                                    Math.max(
                                                        1,
                                                        Math.min(
                                                            100,
                                                            Number(
                                                                e.target.value
                                                            ) || 1
                                                        )
                                                    )
                                                )
                                            }
                                        />
                                        <button
                                            className="plus"
                                            onClick={() =>
                                                setDrawCount((prev) =>
                                                    Math.min(100, prev + 1)
                                                )
                                            }
                                        >
                                            <Plus />
                                        </button>
                                    </div>
                                </div>

                                {/* 2줄: 프리셋 버튼 */}
                                <div className="draw-row">
                                    <div className="draw-count-presets">
                                        <button
                                            type="button"
                                            onClick={() => handlePresetClick(1)}
                                        >
                                            1개
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handlePresetClick(5)}
                                        >
                                            5개
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handlePresetClick(10)}
                                        >
                                            10개
                                        </button>
                                    </div>
                                </div>

                                {/* 3줄: Draw 버튼 */}
                                <div className="draw-row">
                                    <button
                                        className="go-draw"
                                        onClick={draw}
                                        disabled={!isAdmin}
                                    >
                                        Draw!
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            <a
                href={isAdmin ? '/#/admin' : '/#/admin-login'}
                className="go-admin no-capture"
            >
                {isAdmin ? '관리자 페이지로 이동' : '관리자로 로그인'}
            </a>
        </div>
    );
}

export default DrawPage;
