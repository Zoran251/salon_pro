'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function Home() {
  const [visible, setVisible] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => { setTimeout(() => setVisible(true), 100) }, [])

  return (
    <main style={{background:'#0a0a0a',minHeight:'100vh',color:'#f5f0e8',fontFamily:'sans-serif'}}>
      <style>{`
        @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        @keyframes float{0%,100%{transform:rotateX(8deg) rotateY(-8deg) translateY(0)}50%{transform:rotateX(8deg) rotateY(-8deg) translateY(-12px)}}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(212,175,55,.4)}50%{box-shadow:0 0 0 8px rgba(212,175,55,0)}}
        *{box-sizing:border-box}
        .hg{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
        .fg{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .pb{display:flex;justify-content:space-between;align-items:center;gap:48px}
        .dn{display:flex}.mh{display:none}.c3{display:block}
        .fc{transition:border-color .3s}.fc:hover{border-color:rgba(212,175,55,.45)!important}
        @media(max-width:768px){
          .dn{display:none!important}.mh{display:flex!important}.c3{display:none!important}
          .hg{grid-template-columns:1fr!important;gap:24px!important;padding-top:40px!important}
          .ht{font-size:34px!important}.hb{flex-direction:column!important}
          .hb a{text-align:center!important}.fg{grid-template-columns:1fr!important}
          .pb{flex-direction:column!important;align-items:stretch!important;gap:28px!important}
          .pa{font-size:52px!important}.pc{text-align:center!important;padding:16px!important}
          .sp{padding-left:20px!important;padding-right:20px!important}
          .pi{padding:32px 24px!important}
        }
      `}</style>

      {/* NAV */}
      <nav className="sp" style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'18px 48px',borderBottom:'0.5px solid rgba(212,175,55,.2)',background:'rgba(10,10,10,.97)',position:'sticky',top:0,zIndex:100}}>
        <Link href="/" style={{fontSize:'22px',fontWeight:500,background:'linear-gradient(90deg,#d4af37,#f5e17a,#d4af37)',backgroundSize:'200% auto',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',animation:'shimmer 3s linear infinite',textDecoration:'none'}}>
          SalonPro
        </Link>
        <div className="dn" style={{gap:'12px',alignItems:'center'}}>
          <Link href="/registracija" style={{fontSize:'14px',background:'linear-gradient(135deg,#d4af37,#b8960c)',color:'#0a0a0a',padding:'10px 22px',borderRadius:'24px',fontWeight:600,textDecoration:'none',animation:'pulse 2.5s ease infinite'}}>Počni besplatno</Link>
        </div>
        <div className="mh" style={{flexDirection:'column',gap:'5px',cursor:'pointer',padding:'8px'}} onClick={()=>setMenuOpen(!menuOpen)}>
          <div style={{width:'22px',height:'1.5px',background:'#d4af37',transition:'transform .3s',transform:menuOpen?'rotate(45deg) translate(4px,4px)':'none'}}/>
          <div style={{width:'22px',height:'1.5px',background:'#d4af37',transition:'opacity .3s',opacity:menuOpen?0:1}}/>
          <div style={{width:'22px',height:'1.5px',background:'#d4af37',transition:'transform .3s',transform:menuOpen?'rotate(-45deg) translate(4px,-4px)':'none'}}/>
        </div>
      </nav>

      {menuOpen&&<div style={{background:'#111',borderBottom:'0.5px solid rgba(212,175,55,.2)',padding:'20px 24px',display:'flex',flexDirection:'column',gap:'12px',zIndex:99}}>
        <Link href="/registracija" onClick={()=>setMenuOpen(false)} style={{fontSize:'15px',background:'linear-gradient(135deg,#d4af37,#b8960c)',color:'#0a0a0a',padding:'14px',borderRadius:'12px',fontWeight:600,textDecoration:'none',textAlign:'center'}}>Počni besplatno →</Link>
      </div>}

      {/* HERO */}
      <section className="sp hg" style={{padding:'80px 48px 48px',maxWidth:'1200px',margin:'0 auto'}}>
        <div style={{opacity:visible?1:0,transform:visible?'translateY(0)':'translateY(24px)',transition:'all .7s ease'}}>
          <div style={{display:'inline-block',fontSize:'12px',color:'#d4af37',border:'0.5px solid rgba(212,175,55,.4)',padding:'5px 14px',borderRadius:'20px',marginBottom:'20px',letterSpacing:'.5px'}}>✦ Premium salon platforma</div>
          <h1 className="ht" style={{fontSize:'52px',fontWeight:500,lineHeight:1.15,marginBottom:'20px',color:'#f5f0e8'}}>Tvoj salon,<br/><span style={{color:'#d4af37'}}>digitalno savršen</span></h1>
          <p style={{fontSize:'16px',color:'rgba(245,240,232,.55)',lineHeight:1.8,marginBottom:'32px',maxWidth:'440px'}}>QR kod, online zakazivanje, lager i usluge — sve na jednom mjestu. Profesionalno, elegantno, tvoje.</p>
          <div className="hb" style={{display:'flex',gap:'12px'}}>
            <Link href="/registracija" style={{fontSize:'15px',background:'linear-gradient(135deg,#d4af37,#b8960c)',color:'#0a0a0a',padding:'14px 28px',borderRadius:'28px',fontWeight:600,textDecoration:'none'}}>Kreiraj salon besplatno →</Link>
            <Link href="/demo" style={{fontSize:'15px',color:'rgba(245,240,232,.7)',border:'0.5px solid rgba(245,240,232,.2)',padding:'14px 28px',borderRadius:'28px',textDecoration:'none'}}>Pogledaj demo</Link>
          </div>
        </div>
        <div className="c3" style={{opacity:visible?1:0,transform:visible?'translateY(0)':'translateY(24px)',transition:'all .7s .2s ease',perspective:'800px'}}>
          <div style={{background:'linear-gradient(145deg,#1a1a1a,#111)',border:'0.5px solid rgba(212,175,55,.3)',borderRadius:'20px',padding:'28px',animation:'float 4s ease-in-out infinite',boxShadow:'0 40px 80px rgba(0,0,0,.6)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'20px'}}>
              <div style={{fontSize:'18px',fontWeight:500,color:'#d4af37'}}>Salon Elegance</div>
              <div style={{width:'44px',height:'44px',background:'#d4af37',borderRadius:'8px',padding:'5px',display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'2px'}}>
                {[1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1].map((d,i)=>(
                  <div key={i} style={{background:d?'#0a0a0a':'transparent',borderRadius:'1px'}}/>
                ))}
              </div>
            </div>
            <div style={{width:'100%',height:'100px',background:'linear-gradient(135deg,#1f1a0e,#2a2010)',borderRadius:'10px',marginBottom:'18px',display:'flex',alignItems:'center',justifyContent:'center',border:'0.5px solid rgba(212,175,55,.15)',fontSize:'12px',color:'rgba(212,175,55,.4)'}}>fotografija salona</div>
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'18px'}}>
              {['Šišanje','Bojenje','Manikir','Tretmani'].map(s=>(
                <span key={s} style={{fontSize:'11px',background:'rgba(212,175,55,.1)',color:'#d4af37',padding:'4px 10px',borderRadius:'12px',border:'0.5px solid rgba(212,175,55,.2)'}}>{s}</span>
              ))}
            </div>
            <div style={{width:'100%',textAlign:'center',background:'linear-gradient(135deg,#d4af37,#b8960c)',color:'#0a0a0a',padding:'12px',borderRadius:'12px',fontWeight:600,fontSize:'14px',cursor:'pointer'}}>Zakaži termin →</div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="sp fg" style={{padding:'0 48px 64px',maxWidth:'1200px',margin:'0 auto'}}>
        {[
          {icon:'📱',title:'QR landing page',opis:'Skeniranjem QR koda klijenti odmah vide tvoj salon, usluge i slobodne termine.'},
          {icon:'📅',title:'Online zakazivanje',opis:'Klijenti biraju termin sami. Ti samo potvrđuješ i fokusiraš se na posao.'},
          {icon:'📦',title:'Lager i sirovine',opis:'Prati zalihe sirovina i proizvoda. Upozorenje kada nešto ponestaje.'},
        ].map((f,i)=>(
          <div key={i} className="fc" style={{background:'#111',border:'0.5px solid rgba(212,175,55,.15)',borderRadius:'16px',padding:'28px'}}>
            <div style={{fontSize:'28px',marginBottom:'14px'}}>{f.icon}</div>
            <h3 style={{fontSize:'16px',fontWeight:500,color:'#f5f0e8',marginBottom:'10px'}}>{f.title}</h3>
            <p style={{fontSize:'14px',color:'rgba(245,240,232,.45)',lineHeight:1.7}}>{f.opis}</p>
          </div>
        ))}
      </section>

      {/* CIJENE */}
      <section className="sp" style={{padding:'0 48px 80px',maxWidth:'1200px',margin:'0 auto'}}>
        <h2 style={{fontSize:'clamp(28px,4vw,40px)',fontWeight:600,color:'#f5f0e8',textAlign:'center',marginBottom:40,fontFamily:'Georgia,serif'}}>
          Izaberi plan za tvoj salon
        </h2>
        <div style={{display:'flex',gap:20,justifyContent:'center',flexWrap:'wrap',alignItems:'stretch'}}>
          {/* Mjesečna */}
          <div style={{background:'linear-gradient(160deg,#181818,#111)',border:'0.5px solid rgba(212,175,55,.12)',borderRadius:24,padding:'36px 28px',width:280,textAlign:'center',flexShrink:0,display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
            <p style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.25)',marginBottom:20,letterSpacing:'0.22em'}}>MJESEČNA</p>
            <div style={{fontSize:'44px',fontWeight:600,color:'#f5f0e8',lineHeight:1,marginBottom:4,letterSpacing:'-0.02em'}}>29<span style={{fontSize:'24px'}}>,99 €</span></div>
            <p style={{fontSize:'13px',color:'rgba(245,240,232,.3)',marginBottom:20}}>/ mjesec</p>
            <p style={{fontSize:'12px',color:'rgba(245,240,232,.2)',marginBottom:28,lineHeight:1.5}}>Prve 2 sedmice besplatno. Otkaži kad želiš.</p>
            <div style={{marginTop:'auto'}}>
              <Link href="/registracija" style={{fontSize:'13px',background:'rgba(255,255,255,.04)',color:'rgba(255,255,255,.6)',border:'0.5px solid rgba(212,175,55,.15)',padding:'14px 28px',borderRadius:30,fontWeight:500,textDecoration:'none',display:'inline-block',fontFamily:'sans-serif',letterSpacing:'0.1em'}}>
                Izaberi mjesečnu →
              </Link>
            </div>
          </div>
          {/* Godišnja */}
          <div style={{background:'linear-gradient(160deg,#181818,#111)',border:'0.5px solid rgba(212,175,55,.12)',borderRadius:24,padding:'36px 28px',width:280,textAlign:'center',flexShrink:0,display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
            <p style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.25)',marginBottom:20,letterSpacing:'0.22em'}}>GODIŠNJA</p>
            <div style={{fontSize:'44px',fontWeight:600,color:'#f5f0e8',lineHeight:1,marginBottom:4,letterSpacing:'-0.02em'}}>299 €</div>
            <p style={{fontSize:'13px',color:'rgba(245,240,232,.3)',marginBottom:20}}>/ godina</p>
            <p style={{fontSize:'12px',color:'rgba(245,240,232,.2)',marginBottom:28,lineHeight:1.5}}>≈ 24,92€ mjesečno · Ušteda {Math.round(29.99*12-299)}€</p>
            <div style={{marginTop:'auto'}}>
              <Link href="/registracija" style={{fontSize:'13px',background:'rgba(255,255,255,.04)',color:'rgba(255,255,255,.6)',border:'0.5px solid rgba(212,175,55,.15)',padding:'14px 28px',borderRadius:30,fontWeight:500,textDecoration:'none',display:'inline-block',fontFamily:'sans-serif',letterSpacing:'0.1em'}}>
                Izaberi godišnju →
              </Link>
            </div>
          </div>
          {/* Doživotna */}
          <div style={{background:'linear-gradient(160deg,#1f1800,#0f0e00)',border:'1px solid rgba(212,175,55,.5)',borderRadius:24,padding:'36px 28px',width:280,textAlign:'center',flexShrink:0,display:'flex',flexDirection:'column',boxShadow:'0 0 80px rgba(212,175,55,0.08), 0 20px 60px rgba(0,0,0,0.4)',position:'relative'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,transparent,#d4af37,transparent)'}} />
            <div style={{position:'absolute',top:14,right:14,background:'linear-gradient(135deg,#d4af37,#b8960c)',color:'#0a0a0a',fontSize:9,fontWeight:800,padding:'3px 12px',borderRadius:20,fontFamily:'sans-serif',letterSpacing:'0.12em',boxShadow:'0 4px 12px rgba(212,175,55,0.3)'}}>PREPORUČUJEMO</div>
            <p style={{fontSize:11,fontWeight:700,color:'#d4af37',marginBottom:20,letterSpacing:'0.22em'}}>DOŽIVOTNA LICENCA</p>
            <div style={{fontSize:'44px',fontWeight:600,color:'#f5f0e8',lineHeight:1,marginBottom:4,letterSpacing:'-0.02em'}}>1.200 €</div>
            <p style={{fontSize:'13px',color:'rgba(245,240,232,.3)',marginBottom:20}}>jednokratno</p>
            <p style={{fontSize:'12px',color:'rgba(245,240,232,.2)',marginBottom:20,lineHeight:1.5}}>Plati jednom — koristi zauvijek.</p>
            <div style={{marginBottom:16,padding:'10px',border:'0.5px solid rgba(212,175,55,.2)',borderRadius:12,background:'rgba(212,175,55,.04)'}}>
              <div style={{fontSize:10,color:'#d4af37',fontWeight:700,letterSpacing:'0.1em',marginBottom:4}}>🎯 AKCIJA ZA 10 NAJBRŽIH</div>
              <div style={{fontSize:11,color:'rgba(245,240,232,.5)'}}>
                Unesi kod <strong style={{color:'#d4af37'}}>Osnivac10</strong> i dobij doživotnu licencu za samo 500€
              </div>
            </div>
            <div style={{marginTop:'auto'}}>
              <Link href="/registracija" style={{fontSize:'13px',background:'linear-gradient(135deg,#d4af37,#b8960c)',color:'#0a0a0a',border:'none',padding:'14px 28px',borderRadius:30,fontWeight:700,textDecoration:'none',display:'inline-block',fontFamily:'sans-serif',letterSpacing:'0.12em',boxShadow:'0 8px 30px rgba(212,175,55,0.15)'}}>
                Izaberi doživotnu →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer style={{textAlign:'center',padding:'24px',borderTop:'0.5px solid rgba(212,175,55,.1)',color:'rgba(245,240,232,.3)',fontSize:'13px'}}>
        © 2025 SalonPro. Sva prava zadržana.
      </footer>
    </main>
  )
}