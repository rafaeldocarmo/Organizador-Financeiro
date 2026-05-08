import Logo from '@/components/ui/logo';
import Card from '@/components/ui/card';
import Chip from '@/components/ui/chip';
import Sec from '@/components/ui/sec';
import Glyph from '@/components/ui/glyph';
import Spark from '@/components/charts/spark';
import Bars from '@/components/charts/bars';
import Donut from '@/components/charts/donut';
import Progress from '@/components/charts/progress';
import Pips from '@/components/charts/pips';
import { I } from '@/components/ui/icons';
import { CATS } from '@/data/categories';

export default function ScreenSystem() {
  return (
    <div style={{ width: '100%', maxWidth: 1280, margin: '0 auto', padding: 40, background: 'var(--bg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32, borderBottom: '1px solid var(--hairline)', paddingBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Mira · Design system</div>
          <div className="serif" style={{ fontSize: 56, lineHeight: 1, marginTop: 8 }}>Premium fintech, editorial soul.</div>
          <div style={{ fontSize: 14, color: 'var(--ink-2)', maxWidth: 720, marginTop: 14, lineHeight: 1.5 }}>
            Warm near-black canvas. Functional accents instead of decoration. A single &quot;money&quot; lime
            that earns its place by marking the few moments that matter — gains, calls to action, focused
            state. Numbers in monospace. Hero amounts set in italic Instrument Serif for the editorial pause.
          </div>
        </div>
        <Logo size={28} />
      </div>

      <Sec title="Cor · superfícies + tinta" mt={0} mb={14} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 28 }}>
        {[
          { name: 'bg',        val: 'oklch(0.155 0.004 95)' },
          { name: 'bg-2',      val: 'oklch(0.185 0.005 95)' },
          { name: 'surface',   val: 'oklch(0.215 0.005 95)' },
          { name: 'surface-2', val: 'oklch(0.255 0.006 95)' },
          { name: 'surface-3', val: 'oklch(0.305 0.007 95)' },
          { name: 'hairline',  val: 'oklch(0.32 0.005 95)'  },
        ].map(c => (
          <div key={c.name} style={{
            background: c.val, height: 80, borderRadius: 12,
            border: '1px solid var(--hairline)', padding: 12,
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          }}>
            <div className="num" style={{ fontSize: 11, color: 'var(--ink)' }}>{c.name}</div>
            <div className="num" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{c.val.split(' ').slice(1).join(' ')}</div>
          </div>
        ))}
      </div>

      <Sec title="Cor · acento + semântica" mt={0} mb={14} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 28 }}>
        {[
          { name: 'lime',   val: 'var(--lime)',   note: 'CTA · ganhos · foco' },
          { name: 'income', val: 'var(--income)', note: 'Receitas' },
          { name: 'spend',  val: 'var(--spend)',  note: 'Gastos · alertas' },
          { name: 'invest', val: 'var(--invest)', note: 'Investimento' },
          { name: 'saving', val: 'var(--saving)', note: 'Cartão · neutro' },
        ].map(c => (
          <div key={c.name} style={{
            background: c.val, height: 100, borderRadius: 12,
            padding: 14, color: '#1a1d10',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}>
            <div className="num" style={{ fontSize: 12, fontWeight: 500 }}>{c.name}</div>
            <div style={{ fontSize: 11, opacity: 0.75 }}>{c.note}</div>
          </div>
        ))}
      </div>

      <Sec title="Tipografia" mt={0} mb={14} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 28 }}>
        <Card pad={20}>
          <div className="serif" style={{ fontSize: 56, lineHeight: 1 }}>R$ 8.247</div>
          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Display · Instrument Serif Italic</div>
          <div className="num" style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 4 }}>Hero · 56 / 64</div>
        </Card>
        <Card pad={20}>
          <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em' }}>Saúde financeira</div>
          <div style={{ marginTop: 8, fontSize: 14.5, color: 'var(--ink-2)' }}>The quick brown fox aaBb 0123</div>
          <div style={{ marginTop: 14, fontSize: 11, color: 'var(--muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>UI · Geist 500/600</div>
          <div className="num" style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 4 }}>Title 26 / Body 14.5 / Caption 12</div>
        </Card>
        <Card pad={20}>
          <div className="num" style={{ fontSize: 26, fontWeight: 500 }}>R$ 1.247,80</div>
          <div className="num" style={{ marginTop: 8, fontSize: 13, color: 'var(--ink-2)' }}>0123 4567 8901 2345</div>
          <div style={{ marginTop: 14, fontSize: 11, color: 'var(--muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Numerals · Geist Mono</div>
          <div className="num" style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 4 }}>tnum, zero · −0.02em</div>
        </Card>
      </div>

      <Sec title="Componentes" mt={0} mb={14} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <Card pad={20}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Chips</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <Chip dot color="var(--lime)">Em curso</Chip>
            <Chip>Mensal</Chip>
            <Chip dim>23 dias</Chip>
            <Chip dot color="var(--spend)">Vencido</Chip>
            <Chip dot color="var(--invest)">Investido</Chip>
          </div>
        </Card>
        <Card pad={20}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Glyphs · categorias</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Glyph icon={I.cup}    color={CATS.food.color}    />
            <Glyph icon={I.cart}   color={CATS.market.color}  />
            <Glyph icon={I.house}  color={CATS.housing.color} />
            <Glyph icon={I.car}    color={CATS.trans.color}   />
            <Glyph icon={I.film}   color={CATS.fun.color}     />
            <Glyph icon={I.heart}  color={CATS.health.color}  />
            <Glyph icon={I.bolt}   color={CATS.sub.color}     />
            <Glyph icon={I.invest} color={CATS.invest.color}  />
          </div>
        </Card>
        <Card pad={20}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Botões</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button style={{ padding: '8px 14px', borderRadius: 10, background: 'var(--lime)', color: '#1a1d10', fontSize: 13, fontWeight: 500 }}>Novo lançamento</button>
            <button style={{ padding: '8px 14px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--hairline)', fontSize: 13, color: 'var(--ink)' }}>Cancelar</button>
            <button style={{ padding: '8px 14px', borderRadius: 10, background: 'transparent', fontSize: 13, color: 'var(--lime-2)' }}>Editar →</button>
          </div>
        </Card>

        <Card pad={20}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Sparkline + Bars</div>
          <Spark data={[3,4,3.5,5,4.8,5.6,6.2,5.4,6,7]} w={240} h={36} />
          <div style={{ marginTop: 12 }}>
            <Bars data={[
              { label: 'S', v: 30 }, { label: 'T', v: 45 }, { label: 'Q', v: 28 },
              { label: 'Q', v: 60 }, { label: 'S', v: 42 }, { label: 'S', v: 50 }, { label: 'D', v: 22 },
            ]} h={50} activeIdx={3} />
          </div>
        </Card>
        <Card pad={20}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Donut + Progress</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Donut size={80} stroke={10} segments={[
              { v: 32, color: 'var(--lime)'   },
              { v: 24, color: 'var(--invest)' },
              { v: 18, color: 'var(--saving)' },
              { v: 26, color: 'var(--surface-3)' },
            ]} label={<span className="num">75</span>} sub="%" />
            <div style={{ flex: 1 }}>
              <Progress value={75} color="var(--lime)" />
              <div style={{ height: 8 }} />
              <Progress value={48} color="var(--invest)" />
              <div style={{ height: 8 }} />
              <Pips total={12} paid={5} />
            </div>
          </div>
        </Card>
        <Card pad={20}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Inputs</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 12px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--hairline)' }}>
              <I.search s={15} style={{ color: 'var(--muted)' }} />
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>Buscar transação…</span>
            </div>
            <div style={{ height: 40, padding: '0 12px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--lime-line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13 }}>Mercado <span style={{ color: 'var(--muted)' }}>—</span></span>
              <span className="num" style={{ fontSize: 13.5 }}>R$ 287,40</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
