import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Clock, Trash2, Eye, Upload, X, ArrowUpRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import client from '../api/client';
import type { Card, Deal } from '../types';
import Footer from '../components/layout/Footer';

function AnimatedBar({ width, delay }: { width: string; delay: number }) {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true });
    return (
        <div ref={ref} className="flex-[2] h-1 bg-navy-light rounded-sm overflow-hidden">
            <motion.div
                className="h-full bg-gradient-to-r from-gold to-gold-light rounded-sm"
                initial={{ width: 0 }}
                animate={inView ? { width } : {}}
                transition={{ duration: 0.8, delay }}
            />
        </div>
    );
}

const PLAN_LABELS: Record<string, string> = { explorer: 'Explorer', professional: 'Professional', enterprise: 'Enterprise' };
const PLAN_CARD_LIMITS: Record<string, number> = { explorer: 1, professional: 10, enterprise: 999 };
const PLAN_ORDER = ['explorer', 'professional', 'enterprise'];

const PLANS = [
    {
        key: 'explorer',
        name: 'Explorer',
        price: '$0',
        period: '/mo',
        features: ['1 active card', 'Marketplace browsing', 'Basic messaging', 'Community support'],
    },
    {
        key: 'professional',
        name: 'Professional',
        price: '$29',
        period: '/mo',
        features: ['10 active cards', 'All Explorer features', 'Priority listing', 'Email support'],
        highlighted: true,
    },
    {
        key: 'enterprise',
        name: 'Enterprise',
        price: '$199',
        period: '/mo',
        features: ['Unlimited cards', 'All Pro features', 'Dedicated manager', 'Custom contracts'],
    },
];

const VERIFY_TYPES = [
    { type: 'kyc', label: 'KYC — Identity', docOptions: ['id_card', 'passport', 'driver_license'] },
    { type: 'kyb', label: 'KYB — Business', docOptions: ['business_reg'] },
    { type: 'aml', label: 'AML — Screening', docOptions: ['id_card', 'passport'] },
    { type: 'bank', label: 'Bank Account', docOptions: ['business_reg'] },
];

const DOC_OPTION_LABELS: Record<string, string> = {
    id_card: 'National ID Card',
    passport: 'Passport',
    driver_license: "Driver's License",
    business_reg: 'Business Registration',
};

/* ── Verification Upload Modal ── */
function VerifyUploadModal({ verType, label, onClose, onSuccess }: {
    verType: string;
    label: string;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const { addToast } = useNotificationStore();
    const typeConfig = VERIFY_TYPES.find((v) => v.type === verType);
    const docOptions = typeConfig?.docOptions || ['id_card'];
    const [docType, setDocType] = useState(docOptions[0]);
    const [fileFront, setFileFront] = useState<File | null>(null);
    const [fileBack, setFileBack] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const needsBack = verType === 'kyc' && docType !== 'passport';

    const handleUpload = async () => {
        if (!fileFront) { addToast('Please select a document.', 'error'); return; }
        if (needsBack && !fileBack) { addToast('Please select the back side.', 'error'); return; }
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('document', fileFront);
            fd.append('type', verType);
            fd.append('document_type', docType);
            fd.append('document_side', 'front');
            await client.post('/verifications/submit', fd, { headers: { 'Content-Type': 'multipart/form-data' } });

            if (needsBack && fileBack) {
                const bd = new FormData();
                bd.append('document', fileBack);
                bd.append('type', verType);
                bd.append('document_type', docType);
                bd.append('document_side', 'back');
                await client.post('/verifications/submit', bd, { headers: { 'Content-Type': 'multipart/form-data' } });
            }

            addToast(`${label} submitted for review!`, 'success');
            onSuccess();
            onClose();
        } catch (err: any) {
            addToast(err.response?.data?.detail || 'Upload failed.', 'error');
        }
        setUploading(false);
    };

    const inputS: React.CSSProperties = { width: '100%', background: 'var(--navy)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: 'var(--white)', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' };
    const labelS: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--slate)', marginBottom: 6, display: 'block' };
    const fileLabelS: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'var(--navy)', border: '1px dashed var(--border-light)', borderRadius: 10, cursor: 'pointer' };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.85)', backdropFilter: 'blur(4px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
            <div style={{ background: 'var(--navy-mid)', border: '1px solid var(--border-light)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--white)' }}>Submit {label}</div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--slate)', cursor: 'pointer' }}><X size={18} /></button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label style={labelS}>Document type</label>
                        <select value={docType} onChange={(e) => setDocType(e.target.value)} style={inputS}>
                            {docOptions.map((opt) => <option key={opt} value={opt}>{DOC_OPTION_LABELS[opt] || opt}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={labelS}>{needsBack ? 'Front side' : 'Document'}</label>
                        <label style={fileLabelS}>
                            <Upload size={16} style={{ color: 'var(--slate)', flexShrink: 0 }} />
                            <span style={{ fontSize: 13, color: fileFront ? 'var(--white)' : 'var(--slate)' }}>{fileFront ? fileFront.name : 'Click to select (JPG, PNG, PDF)'}</span>
                            <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setFileFront(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                        </label>
                    </div>
                    {needsBack && (
                        <div>
                            <label style={labelS}>Back side</label>
                            <label style={fileLabelS}>
                                <Upload size={16} style={{ color: 'var(--slate)', flexShrink: 0 }} />
                                <span style={{ fontSize: 13, color: fileBack ? 'var(--white)' : 'var(--slate)' }}>{fileBack ? fileBack.name : 'Click to select (JPG, PNG, PDF)'}</span>
                                <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setFileBack(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                            </label>
                        </div>
                    )}
                    <button
                        onClick={handleUpload}
                        disabled={uploading || !fileFront}
                        style={{ padding: '12px', background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', color: 'var(--navy)', fontWeight: 700, fontSize: 14, border: 'none', borderRadius: 12, cursor: uploading || !fileFront ? 'not-allowed' : 'pointer', opacity: uploading || !fileFront ? 0.5 : 1 }}
                    >
                        {uploading ? 'Uploading…' : 'Submit for review'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    const { user, setUser } = useAuthStore();
    const { addToast } = useNotificationStore();

    const [myCards, setMyCards] = useState<Card[]>([]);
    const [deals, setDeals] = useState<Deal[]>([]);
    const [verifications, setVerifications] = useState<{ type: string; status: string; rejection_reason?: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadingVerType, setUploadingVerType] = useState<string | null>(null);
    const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        const [cardsRes, dealsRes, verRes] = await Promise.allSettled([
            client.get('/cards/mine'),
            client.get('/deals'),
            client.get('/verifications/me'),
        ]);
        if (cardsRes.status === 'fulfilled') setMyCards(cardsRes.value.data);
        if (dealsRes.status === 'fulfilled') setDeals(dealsRes.value.data);
        if (verRes.status === 'fulfilled') setVerifications(verRes.value.data);
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    const deleteCard = async (id: number) => {
        try {
            await client.delete(`/cards/${id}`);
            setMyCards((prev) => prev.map((c) => (
                c.id === id ? { ...c, proposal_status: 'offer_deleted', is_active: false } : c
            )));
            addToast('Card marked as deleted and chat locked.', 'success');
        } catch {
            addToast('Failed to delete card.', 'error');
        }
    };

    const handleUpgradePlan = async (newPlan: string) => {
        setUpgradingPlan(newPlan);
        try {
            const res = await client.patch('/users/me', { plan: newPlan });
            setUser(res.data);
            addToast(`Switched to ${PLAN_LABELS[newPlan]}!`, 'success');
        } catch (err: any) {
            addToast(err.response?.data?.detail || 'Failed to update plan.', 'error');
        }
        setUpgradingPlan(null);
    };

    if (!user) return null;

    const initials = user.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
    const roleLabel = user.role === 'both' ? 'Provider & Seeker' : user.role === 'admin' ? 'Administrator' : user.role.charAt(0).toUpperCase() + user.role.slice(1);
    const planLabel = PLAN_LABELS[user.plan] || user.plan;
    const cardLimit = PLAN_CARD_LIMITS[user.plan] || 1;
    const currentPlanIndex = PLAN_ORDER.indexOf(user.plan);

    const trustBreakdown = [
        { label: 'Identity', score: user.is_verified ? 100 : 0 },
        { label: 'Deal History', score: Math.min(deals.length * 20, 100) },
        { label: 'Account Standing', score: user.trust_score },
    ];

    return (
        <div className="page-wrapper">
            <div className="px-5 md:px-10 py-10" style={{ flex: 1 }}>
                <div className="mb-7">
                    <div className="text-[11px] font-semibold tracking-[1.5px] uppercase text-gold mb-2">Member Profile</div>
                    <div className="font-serif text-[28px] text-white-custom">Trust Profile</div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
                    {/* ── Left Column ── */}
                    <div>
                        <div className="bg-navy-mid border border-border-light rounded-2xl p-8 sticky top-[130px]">
                            {/* Avatar */}
                            <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-gold to-gold-light flex items-center justify-center text-[28px] font-bold text-navy font-serif mb-4">
                                {initials}
                            </div>
                            <div className="text-xl font-semibold text-white-custom mb-1">{user.full_name}</div>
                            <div className="text-[13px] text-slate-custom mb-1">{roleLabel}{user.company_name ? ` · ${user.company_name}` : ''}</div>
                            <div className="text-[11px] text-gold font-semibold mb-5">{planLabel} Plan · {user.email}</div>

                            {/* Trust Score */}
                            <motion.div className="text-center p-6 bg-gold/5 border border-border-gold rounded-xl mb-5" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
                                <motion.div className="font-serif text-[48px] text-gold leading-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                                    {user.trust_score}
                                </motion.div>
                                <div className="text-xs text-slate-custom mt-1">Trust Score</div>
                                <div className={`text-[11px] mt-1.5 font-medium ${user.trust_score >= 80 ? 'text-green-custom' : user.trust_score >= 50 ? 'text-gold' : 'text-red-custom'}`}>
                                    {user.trust_score >= 80 ? '↑ Excellent' : user.trust_score >= 50 ? '→ Building' : '↓ New Account'}
                                </div>
                            </motion.div>

                            {/* Trust Breakdown */}
                            <div className="flex flex-col gap-3 mb-6">
                                {trustBreakdown.map((item, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="flex-1 text-xs text-slate-custom">{item.label}</div>
                                        <AnimatedBar width={`${item.score}%`} delay={i * 0.1} />
                                        <div className="text-xs font-mono text-white-custom w-6 text-right">{item.score}</div>
                                    </div>
                                ))}
                            </div>

                            {/* ── Verification Items ── */}
                            <div className="text-[11px] font-semibold tracking-[1.5px] uppercase text-gold mb-3">Verifications</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {VERIFY_TYPES.map((c) => {
                                    const v = verifications.find((vr) => vr.type === c.type);
                                    const approved = v?.status === 'approved';
                                    const pending = v?.status === 'pending';
                                    const rejected = v?.status === 'rejected';
                                    return (
                                        <div
                                            key={c.type}
                                            className="pvr-item"
                                            onClick={() => !approved && !pending && setUploadingVerType(c.type)}
                                            title={approved ? 'Approved' : pending ? 'Under review — awaiting admin' : rejected ? 'Rejected — click to resubmit' : 'Click to submit'}
                                            style={{ cursor: approved || pending ? 'default' : 'pointer' }}
                                        >
                                            <div className="pvr-icon" style={{ background: approved ? 'rgba(26,158,110,0.1)' : pending ? 'rgba(201,168,76,0.1)' : rejected ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.04)' }}>
                                                {approved
                                                    ? <CheckCircle size={13} style={{ color: '#1A9E6E' }} />
                                                    : pending
                                                        ? <Clock size={13} style={{ color: 'var(--gold)' }} />
                                                        : <AlertCircle size={13} style={{ color: rejected ? '#f87171' : 'var(--slate)' }} />}
                                            </div>
                                            <span className="pvr-label">{c.label}</span>
                                            {approved && <span className="pvr-status approved">Approved</span>}
                                            {pending && <span className="pvr-status pending">Pending</span>}
                                            {rejected && <span className="pvr-status" style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171' }}>Rejected</span>}
                                            {!approved && !pending && !rejected && <Upload size={12} className="pvr-upload-icon" />}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ── Right Column ── */}
                    <div>
                        {/* My Cards */}
                        <motion.div className="bg-navy-mid border border-border-light rounded-2xl p-6 mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <div className="flex items-center justify-between mb-5">
                                <div className="text-sm font-semibold text-white-custom">My Cards</div>
                                <div className="text-[11px] text-slate-custom">{myCards.length} / {cardLimit === 999 ? '∞' : cardLimit} cards</div>
                            </div>
                            {loading ? (
                                <div style={{ color: 'var(--slate)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>Loading…</div>
                            ) : myCards.length > 0 ? myCards.map((card) => (
                                <div key={card.id} className="bg-navy border border-border-light rounded-xl p-5 mb-3 last:mb-0">
                                    <div className="flex items-start justify-between mb-3">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span className={`px-2.5 py-1 text-[11px] font-semibold tracking-[0.5px] uppercase rounded-full ${card.type === 'offer' ? 'bg-green-custom/[0.12] text-green-custom border border-green-custom/25' : 'bg-[#4da8ff]/[0.12] text-[#4da8ff] border border-[#4da8ff]/25'}`}>
                                                {card.type === 'offer' ? 'Sell' : 'Rent'}
                                            </span>
                                            {card.proposal_status === 'pending' && (
                                                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', background: 'rgba(201,168,76,0.1)', color: 'var(--gold)', borderRadius: 5, border: '1px solid rgba(201,168,76,0.2)' }}>Awaiting review</span>
                                            )}
                                            {card.proposal_status === 'declined' && (
                                                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', background: 'rgba(248,113,113,0.1)', color: '#f87171', borderRadius: 5, border: '1px solid rgba(248,113,113,0.2)' }}>Declined</span>
                                            )}
                                            {card.proposal_status === 'offer_deleted' && (
                                                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', background: 'rgba(125,125,125,0.14)', color: 'var(--slate)', borderRadius: 5, border: '1px solid rgba(125,125,125,0.24)' }}>Offer deleted</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] text-slate-custom flex items-center gap-1"><Eye size={11} /> {card.views_count}</span>
                                            <motion.button onClick={() => deleteCard(card.id)} whileHover={{ scale: 1.15 }} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: 'rgba(255,80,80,0.06)', border: '1px solid rgba(255,80,80,0.15)', color: '#f87171', cursor: 'pointer' }}>
                                                <Trash2 size={12} />
                                            </motion.button>
                                        </div>
                                    </div>
                                    <div className="text-base font-semibold text-white-custom mb-2">{card.title}</div>
                                    <div className="text-[13px] text-slate-custom leading-relaxed mb-3">{card.description}</div>
                                    <div className="flex gap-1.5 mb-3 flex-wrap">
                                        {[...(card.regions || []), ...(card.industries || [])].slice(0, 4).map((tag) => (
                                            <span key={tag} className="px-2 py-0.5 text-[11px] font-medium bg-white/5 border border-border-light rounded-full text-slate-custom">{tag}</span>
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-between pt-3 border-t border-border-light">
                                        <div className="text-xs text-slate-custom">{card.gateway_type || 'Gateway'} · {card.pricing_model}</div>
                                        <div className="font-mono text-[15px] font-medium text-gold">
                                            {card.pricing_model === 'percentage' ? `${card.commission_rate}%` : card.pricing_model === 'fixed' ? `€${card.fixed_fee?.toFixed(2)}` : 'Nego.'}
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div style={{ color: 'var(--slate)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>You haven't posted any cards yet.</div>
                            )}
                        </motion.div>

                        {/* Deal History */}
                        <motion.div className="bg-navy-mid border border-border-light rounded-2xl p-6 mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                            <div className="text-sm font-semibold text-white-custom mb-5">Deal History</div>
                            {deals.length > 0 ? deals.map((deal) => (
                                <div key={deal.id} className="flex items-center gap-3 py-3 border-b border-border-light last:border-b-0">
                                    <div className="flex-1">
                                        <div className="text-[13px] font-medium text-white-custom">{deal.provider_name || 'Provider'} ↔ {deal.seeker_name || 'Seeker'}</div>
                                        <div className="text-[11px] text-slate-custom mt-0.5">{deal.card_title || 'Deal'} · {deal.monthly_volume ? `$${(deal.monthly_volume / 1000).toFixed(0)}K/mo` : 'N/A'}</div>
                                    </div>
                                    <span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${deal.status === 'completed' || deal.status === 'active' ? 'bg-green-custom/[0.12] text-green-custom' : deal.status === 'terminated' ? 'bg-red-custom/10 text-red-custom' : 'bg-gold/10 text-gold'}`}>
                                        {deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
                                    </span>
                                </div>
                            )) : (
                                <div style={{ color: 'var(--slate)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>No deals yet.</div>
                            )}
                        </motion.div>

                        {/* ── Plan Upgrade Section ── */}
                        <motion.div className="plan-upgrade-section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                            <div className="plan-section-title">Plan & Billing</div>
                            <div className="plan-section-sub">
                                You are on the <strong style={{ color: 'var(--gold)' }}>{planLabel}</strong> plan — {cardLimit === 999 ? 'unlimited cards' : `${cardLimit} card${cardLimit > 1 ? 's' : ''} max`}.
                            </div>
                            <div className="plan-grid">
                                {PLANS.map((plan) => {
                                    const isCurrent = user.plan === plan.key;
                                    const planIdx = PLAN_ORDER.indexOf(plan.key);
                                    const isUpgrade = planIdx > currentPlanIndex;
                                    return (
                                        <div key={plan.key} className={`plan-card${isCurrent ? ' current' : (plan as any).highlighted ? ' highlighted' : ''}`}>
                                            <div className="plan-card-name">{plan.name}</div>
                                            <div className="plan-card-price">{plan.price}<span>{plan.period}</span></div>
                                            <div className="plan-card-features">
                                                {plan.features.map((f) => (
                                                    <div key={f} className="plan-card-feature">
                                                        <CheckCircle size={11} style={{ color: '#1A9E6E', flexShrink: 0 }} />
                                                        {f}
                                                    </div>
                                                ))}
                                            </div>
                                            {isCurrent ? (
                                                <div className="plan-current-badge">Current Plan</div>
                                            ) : isUpgrade ? (
                                                <button className="plan-upgrade-btn" disabled={upgradingPlan === plan.key} onClick={() => handleUpgradePlan(plan.key)}>
                                                    {upgradingPlan === plan.key ? 'Updating…' : <><ArrowUpRight size={13} style={{ display: 'inline', marginRight: 4 }} />Upgrade</>}
                                                </button>
                                            ) : (
                                                <button className="plan-downgrade-btn" disabled={upgradingPlan === plan.key} onClick={() => handleUpgradePlan(plan.key)}>
                                                    {upgradingPlan === plan.key ? 'Updating…' : 'Switch'}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {uploadingVerType && (
                <VerifyUploadModal
                    verType={uploadingVerType}
                    label={VERIFY_TYPES.find((v) => v.type === uploadingVerType)?.label || uploadingVerType}
                    onClose={() => setUploadingVerType(null)}
                    onSuccess={loadData}
                />
            )}

            <Footer />
        </div>
    );
}
