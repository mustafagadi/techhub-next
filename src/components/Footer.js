import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.top}>
          <div className={styles.brand}>
            <div className={styles.logo}><span className={styles.mark}>T</span><span>TechHub Portal</span></div>
            <p>منصّة واجهات برمجية موحّدة لربط أنظمتك بالخدمات العقارية والبلدية بأمان وكفاءة.</p>
          </div>
          {/*<div className={styles.col}>*/}
          {/*  <h4>المنصّة</h4>*/}
          {/*  <ul><li><a href="/services">الخدمات</a></li><li><a href="/#advantages">المزايا</a></li></ul>*/}
          {/*</div>*/}
          {/*<div className={styles.col}>*/}
          {/*  <h4>الدعم</h4>*/}
          {/*  <ul><li><a href="/#contact">تواصل معنا</a></li><li><a href="/#contact">الأسئلة الشائعة</a></li></ul>*/}
          {/*</div>*/}
        </div>
        <div className={styles.bottom}>
          <span>جميع الحقوق محفوظة © 2026</span>
        </div>
      </div>
    </footer>
  );
}
