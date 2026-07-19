'use client';
import { useState, useEffect, useCallback } from 'react';
import { getDashboardSummary, getDashboardTraffic, getEnvironment, setEnvironment } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { fmtDate } from '@/lib/dates';
import { AreaChart, BarList, FunnelBars } from '@/components/MiniCharts';
import styles from '../admin.module.css';

const nf = new Intl.NumberFormat('en-US');

export default function OverviewPage() {
  const { t } = useI18n();
  const [summary, setSummary] = useState(null);
  const [traffic, setTraffic] = useState(null);
  const [days, setDays] = useState(30);
  const [env, setEnv] = useState('test');
  const [loadingTraffic, setLoadingTraffic] = useState(true);

  useEffect(() => {
    setEnv(getEnvironment());
    getDashboardSummary().then(setSummary).catch(() => {});
  }, []);

  const loadTraffic = useCallback((d, e) => {
    setLoadingTraffic(true);
    if (e) setEnvironment(e);
    getDashboardTraffic(d)
      .then(setTraffic)
      .catch(() => setTraffic({ available: false, daily: [], topProducts: [], topPartners: [], totalCalls: 0, totalErrors: 0 }))
      .finally(() => setLoadingTraffic(false));
  }, []);

  useEffect(() => { loadTraffic(days, null); }, [days, loadTraffic]);

  const kpis = summary && [
    { v: summary.pendingSignups, l: t('dashboard.pending_signups') },
    { v: summary.pendingComplianceSteps, l: t('dashboard.pending_compliance') },
    { v: summary.pendingPromotions, l: t('dashboard.pending_promotions') },
    { v: summary.newInterestRequests, l: t('dashboard.new_interest') },
    { v: summary.activePartners, l: t('dashboard.active_partners') },
    { v: summary.deactivatedPartners, l: t('dashboard.deactivated_partners') },
    { v: nf.format(summary.paidThisMonth), l: t('dashboard.paid_month') },
    { v: nf.format(summary.paidTotal), l: t('dashboard.paid_total') },
  ];

  return (
    <>
      <div className={styles.topbar}>
        <h1>{t('dashboard.title')}</h1>
      </div>
      <div className={styles.content}>
        {kpis && (
          <div className={`${styles.stats} ${styles.stats4}`}>
            {kpis.map((k) => (
              <div key={k.l} className={styles.stat}>
                <div className={styles.v} style={{ fontVariantNumeric: 'tabular-nums', direction: 'ltr' }}>{k.v}</div>
                <div className={styles.l}>{k.l}</div>
              </div>
            ))}
          </div>
        )}

        <div className={styles.dashGrid}>
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span>{t('dashboard.traffic_title')}</span>
              <div className={styles.rangeTabs}>
                {['test', 'prod'].map((e) => (
                  <button key={e} className={`${styles.rangeTab} ${env === e ? styles.rangeTabActive : ''}`}
                    onClick={() => { setEnv(e); loadTraffic(days, e); }}>
                    {e}
                  </button>
                ))}
                <span style={{ width: 10 }} />
                {[7, 30, 90].map((d) => (
                  <button key={d} className={`${styles.rangeTab} ${days === d ? styles.rangeTabActive : ''}`}
                    onClick={() => setDays(d)}>
                    {t(`dashboard.days_${d}`)}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.panelBody}>
              {loadingTraffic ? (
                <p className={styles.l}>…</p>
              ) : !traffic?.available ? (
                <div className={styles.unavailable}>{t('dashboard.traffic_unavailable')}</div>
              ) : (
                <>
                  <div className={styles.trafficTotals}>
                    <span>{t('dashboard.traffic_calls')}: <b>{nf.format(traffic.totalCalls)}</b></span>
                    <span>{t('dashboard.traffic_errors')}: <b>{nf.format(traffic.totalErrors)}</b></span>
                  </div>
                  <AreaChart points={traffic.daily} />
                  <p className={styles.l} style={{ marginTop: 10 }}>{t('dashboard.note_reporting')}</p>
                </>
              )}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHead}><span>{t('dashboard.funnel_title')}</span></div>
            <div className={styles.panelBody}>
              {summary && (
                <FunnelBars stages={[
                  { label: t('dashboard.funnel_interest'), value: summary.funnel.interestRequests },
                  { label: t('dashboard.funnel_signups'), value: summary.funnel.signupsSubmitted },
                  { label: t('dashboard.funnel_approved'), value: summary.funnel.signupsApproved },
                  { label: t('dashboard.funnel_compliance'), value: summary.funnel.complianceComplete },
                ]} />
              )}
            </div>
          </div>
        </div>

        {traffic?.available && (traffic.topProducts.length > 0 || traffic.topPartners.length > 0) && (
          <div className={styles.dashGrid2}>
            <div className={styles.card}>
              <div className={styles.cardHead}><span>{t('dashboard.top_products')}</span></div>
              <div className={styles.panelBody}><BarList items={traffic.topProducts} /></div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardHead}><span>{t('dashboard.top_partners')}</span></div>
              <div className={styles.panelBody}><BarList items={traffic.topPartners} /></div>
            </div>
          </div>
        )}

        {summary && (
          <div className={styles.dashGrid2}>
            <div className={styles.card}>
              <div className={styles.cardHead}><span>{t('dashboard.recent_signups')}</span></div>
              <table className={styles.miniTable}>
                <thead>
                  <tr>
                    <th>{t('dashboard.col_company')}</th>
                    <th>{t('dashboard.col_email')}</th>
                    <th>{t('dashboard.col_status')}</th>
                    <th>{t('dashboard.col_date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recentSignups.map((s, i) => (
                    <tr key={i}>
                      <td>{s.companyName}</td>
                      <td style={{ direction: 'ltr', textAlign: 'start' }}>{s.email}</td>
                      <td>{s.status}</td>
                      <td>{fmtDate(s.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.card}>
              <div className={styles.cardHead}><span>{t('dashboard.recent_orders')}</span></div>
              <table className={styles.miniTable}>
                <thead>
                  <tr>
                    <th>{t('dashboard.col_service')}</th>
                    <th>{t('dashboard.col_email')}</th>
                    <th>{t('dashboard.col_amount')}</th>
                    <th>{t('dashboard.col_status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recentOrders.map((o, i) => (
                    <tr key={i}>
                      <td>{o.productName}</td>
                      <td style={{ direction: 'ltr', textAlign: 'start' }}>{o.developerEmail}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{nf.format(o.amount)}</td>
                      <td>{o.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
