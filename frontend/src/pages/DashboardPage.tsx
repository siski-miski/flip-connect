import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, Shield, CheckCircle, AlertCircle, Trash2, Eye, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import client from '../api/client';
import Footer from '../components/layout/Footer';
import type { Card, DashboardStats as Stats, VolumeHistory, Deal, Notification } from '../types';

function KPICountUp({ end, prefix = '', suffix = '' }: { end: number; prefix?: string; suffix?: string }) {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true });
    useEffect(() => {
        if (!inView) return;
        if (end === 0) { setCount(0); return; }
        let s = 0;
        const step = end / 60;
        const t = setInterval(() => { s += step; if (s >= end) { setCount(end); clearInterval(t); } else setCount(Math.floor(s)); }, 16);
        return () => clearInterval(t);
    }, [inView, end]);
    return <div ref={ref} className="font-serif text-[30px] text-white-custom">{prefix}{count.toLocaleString()}{suffix}</div>;
}

const statusStyles: Record<string, string> = {
    active: 'bg-green-custom/[0.12] text-green-custom',
    pending: 'bg-gold/10 text-gold',
    review: 'bg-red-custom/10 text-red-custom',
};

export default function DashboardPage() {
    const { user } = useAuthStore();
    const { addToast } = useNotificationStore();
    const name = user?.full_name?.split(' ')[0] || 'there';

    const [stats, setStats] = useState<Stats>({ active_deals: 0, volume_processed: 0, revenue_earned: 0, trust_score: 50 });
    const [volumeData, setVolumeData] = useState<VolumeHistory[]>([]);
    const [deals, setDeals] = useState<Deal[]>([]);
    const [myCards, setMyCards] = useState<Card[]>([]);
    const [activities, setActivities] = useState<Notification[]>([]);
    const [verifications, setVerifications] = useState<{ type: string; status: string }[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [statsRes, volRes, dealsRes, cardsRes, actRes, verRes] = await Promise.allSettled([
                client.get('/dashboard/stats'),
                client.get('/dashboard/volume-history'),
                client.get('/deals'),
                client.get('/cards/mine'),
                client.get('/notifications'),
                client.get('/verifications/me'),
            ]);
            if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
            if (volRes.status === 'fulfilled') setVolumeData(volRes.value.data);
            if (dealsRes.status === 'fulfilled') setDeals(dealsRes.value.data);
            if (cardsRes.status === 'fulfilled') setMyCards(cardsRes.value.data);
            if (actRes.status === 'fulfilled') setActivities(actRes.value.data);
            if (verRes.status === 'fulfilled') setVerifications(verRes.value.data);
        } catch {}
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, []);

    const deleteCard = async (id: number) => {
        try {
            await client.delete(`/cards/${id}`);
            setMyCards((prev) => prev.filter((c) => c.id !== id));
            addToast('Card deleted.', 'success');
        } catch {
            addToast('Failed to delete card.', 'error');
        }
    };

    const kpiData = [
        { label: 'Active Deals', value: stats.active_deals, change: stats.active_deals > 0 ? `${stats.active_deals} active` : 'No deals yet', up: stats.active_deals > 0, icon: <BarChart3 size={16} /> },
        { label: 'Volume Processed', value: Math.round(stats.volume_processed / 1000), prefix: '$', suffix: 'K', change: stats.volume_processed > 0 ? 'From active deals' : 'No volume yet', up: stats.volume_processed > 0, icon: <TrendingUp size={16} /> },
        { label: 'Revenue Earned', value: Math.round(stats.revenue_earned), prefix: '$', change: stats.revenue_earned > 0 ? '2.8% commission' : 'No revenue yet', up: stats.revenue_earned > 0, icon: <DollarSign size={16} /> },
        { label: 'Trust Score', value: stats.trust_score, change: stats.trust_score >= 80 ? 'Strong' : 'Building', up: stats.trust_score >= 50, icon: <Shield size={16} />, gold: true },
    ];

    const complianceItems = [
        { type: 'kyc', label: 'KYC — Identity verification' },
        { type: 'kyb', label: 'KYB — Business verification' },
        { type: 'aml', label: 'AML — Anti-money laundering' },
        { type: 'bank', label: 'Bank account verification' },
    ];

    if (loading) {
        return (
            <div className="page-wrapper">
                <div className="px-5 md:px-10 py-10" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                    <div style={{ color: 'var(--slate)', fontSize: 14 }}>Loading dashboard…</div>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="page-wrapper">
        <div className="px-5 md:px-10 py-10" style={{ flex: 1 }}>
            <div className="mb-7">
                <div className="text-[11px] font-semibold tracking-[1.5px] uppercase text-gold mb-2">Your Dashboard</div>
                <div className="font-serif text-[28px] text-white-custom">Welcome, {name}</div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {kpiData.map((kpi, i) => (
                    <motion.div
                        key={i}
                        className="bg-navy-mid border border-border-light rounded-2xl p-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                    >
                        <div className="text-xs font-medium text-slate-custom mb-2.5 flex items-center gap-2">
                            <span className="text-gold">{kpi.icon}</span>
                            {kpi.label}
                        </div>
                        <div className={kpi.gold ? 'font-serif text-[30px] text-gold' : ''}>
                            {kpi.gold ? <KPICountUp end={kpi.value} /> : <KPICountUp end={kpi.value} prefix={kpi.prefix} suffix={kpi.suffix} />}
                        </div>
                        <div className={`text-xs font-medium ${kpi.up ? 'text-green-custom' : 'text-slate-custom'}`}>{kpi.change}</div>
                    </motion.div>
                ))}
            </div>

            {/* Volume Chart + Deals */}
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 mb-6">
                <motion.div className="bg-navy-mid border border-border-light rounded-2xl p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                    <div className="text-sm font-semibold text-white-custom mb-5">
                        Monthly Volume <span className="text-xs text-slate-custom font-normal ml-1">Last 7 months</span>
                    </div>
                    {volumeData.some(v => v.volume > 0) ? (
                        <ResponsiveContainer width="100%" height={140}>
                            <BarChart data={volumeData}>
                                <XAxis dataKey="month" tick={{ fill: '#8892A4', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{ background: '#112240', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12, color: '#F8F9FB' }}
                                    formatter={(v: any) => [`$${(Number(v) / 1000).toFixed(0)}K`, 'Volume']}
                                />
                                <Bar dataKey="volume" fill="url(#goldGradient)" radius={[4, 4, 0, 0]} animationDuration={1200} />
                                <defs>
                                    <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="rgba(201,168,76,0.7)" />
                                        <stop offset="100%" stopColor="rgba(201,168,76,0.3)" />
                                    </linearGradient>
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate)', fontSize: 13 }}>
                            No volume data yet — complete your first deal to see chart data.
                        </div>
                    )}
                </motion.div>

                <motion.div className="bg-navy-mid border border-border-light rounded-2xl p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                    <div className="text-sm font-semibold text-white-custom mb-5">Active Deals</div>
                    {deals.length > 0 ? deals.slice(0, 5).map((deal) => (
                        <div key={deal.id} className="flex items-center gap-3 py-3 border-b border-border-light last:border-b-0">
                            <div className="flex-1">
                                <div className="text-[13px] font-medium text-white-custom">{deal.provider_name || 'Provider'} ↔ {deal.seeker_name || 'Seeker'}</div>
                                <div className="text-[11px] text-slate-custom mt-0.5">{deal.card_title || 'Deal'} · {deal.monthly_volume ? `$${(deal.monthly_volume / 1000).toFixed(0)}K/mo` : 'N/A'}</div>
                            </div>
                            <span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${statusStyles[deal.status] || 'bg-gold/10 text-gold'}`}>
                                {deal.status === 'active' ? 'Active' : deal.status === 'pending' ? 'Pending' : deal.status === 'completed' ? 'Completed' : 'In Review'}
                            </span>
                        </div>
                    )) : (
                        <div style={{ color: 'var(--slate)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
                            No deals yet — browse the marketplace to find opportunities.
                        </div>
                    )}
                </motion.div>
            </div>

            {/* My Cards + Compliance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <motion.div className="bg-navy-mid border border-border-light rounded-2xl p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                    <div className="text-sm font-semibold text-white-custom mb-5">My Active Cards</div>
                    {myCards.length > 0 ? myCards.map((card) => (
                        <div key={card.id} className="flex items-center gap-3 py-3 border-b border-border-light last:border-b-0">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase ${card.type === 'offer' ? 'bg-green-custom/[0.12] text-green-custom' : 'bg-[#4da8ff]/[0.12] text-[#4da8ff]'}`}>
                                {card.type}
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className="text-[13px] font-medium text-white-custom truncate">{card.title}</div>
                                <div className="text-[11px] text-slate-custom mt-0.5 flex items-center gap-2">
                                    <Eye size={10} /> {card.views_count} views
                                </div>
                            </div>
                            <motion.button
                                onClick={() => deleteCard(card.id)}
                                whileHover={{ scale: 1.15 }}
                                title="Delete card"
                                style={{
                                    width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    borderRadius: 8, background: 'rgba(255,80,80,0.06)', border: '1px solid rgba(255,80,80,0.15)',
                                    color: '#f87171', cursor: 'pointer', flexShrink: 0,
                                }}
                            >
                                <Trash2 size={13} />
                            </motion.button>
                        </div>
                    )) : (
                        <div style={{ color: 'var(--slate)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
                            You haven't posted any cards yet.
                        </div>
                    )}
                </motion.div>

                <motion.div className="bg-navy-mid border border-border-light rounded-2xl p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                    <div className="text-sm font-semibold text-white-custom mb-5">Compliance Checklist</div>
                    <div className="flex flex-col gap-2">
                        {complianceItems.map((c) => {
                            const v = verifications.find((vr) => vr.type === c.type);
                            const done = v?.status === 'approved';
                            const pending = v?.status === 'pending';
                            return (
                                <div key={c.type} className="flex items-center gap-2.5 text-[13px] text-slate-custom">
                                    <div className={`w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] shrink-0 ${done ? 'bg-green-custom/15 text-green-custom' : pending ? 'bg-gold/10 text-gold' : 'bg-red-custom/10 text-red-custom'}`}>
                                        {done ? <CheckCircle size={10} /> : pending ? <Clock size={10} /> : <AlertCircle size={10} />}
                                    </div>
                                    {c.label}
                                    {pending && <span className="text-[10px] text-gold ml-auto">Pending review</span>}
                                    {done && <span className="text-[10px] text-green-custom ml-auto">Approved</span>}
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            </div>

            {/* Recent Activity */}
            <motion.div className="bg-navy-mid border border-border-light rounded-2xl p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
                <div className="text-sm font-semibold text-white-custom mb-5">Recent Activity</div>
                {activities.length > 0 ? activities.slice(0, 6).map((a) => (
                    <div key={a.id} className="flex items-start gap-3 py-3 border-b border-border-light last:border-b-0">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${a.is_read ? 'bg-slate-custom' : 'bg-gold'}`} />
                        <div>
                            <div className="text-[13px] text-slate-custom leading-relaxed">{a.message}</div>
                            <div className="text-[11px] text-slate-custom mt-0.5 font-mono">{new Date(a.created_at).toLocaleDateString()}</div>
                        </div>
                    </div>
                )) : (
                    <div style={{ color: 'var(--slate)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
                        No activity yet — your actions and notifications will appear here.
                    </div>
                )}
            </motion.div>

        </div>
            <Footer />
        </div>
    );
}
