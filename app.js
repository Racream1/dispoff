(() => {
  const e = React.createElement;
  const { useState, useEffect } = React;

  // Initialize Dexie database
  const db = new Dexie('UTIDevicesDB');
  db.version(1).stores({
    respostas: '++id, data, leito, atendimento, nascimento'
  });

  async function addResposta(obj) {
    await db.respostas.add(obj);
  }

  async function loadLast(leito) {
    const list = await db.respostas
      .where('leito').equals(leito)
      .reverse()
      .limit(1)
      .toArray();
    return list[0] || {};
  }

  function LeitoCard({ leito, onClick }) {
    return e('div', { className: 'border p-4 rounded shadow hover:bg-white cursor-pointer', onClick },
      e('h2', { className: 'text-xl font-semibold' }, leito)
    );
  }

  function FormModal({ leito, onClose }) {
    const [last, setLast] = useState({});
    const [samePatient, setSamePatient] = useState(null);
    const [form, setForm] = useState({});

    useEffect(() => {
      const today = new Date().toISOString().split('T')[0];
      setForm({
        leito,
        data: today,
        atendimento: '',
        nascimento: '',
        uso_cvc: 'não', cvc_0:'',cvc_1:'',cvc_2:'',cvc_3:'',cvc_4:'',
        uso_pai: 'não', pai_0:'',pai_1:'',pai_2:'',
        uso_cdl: 'não', cdl_0:'',cdl_1:'',
        uso_tot: 'não', tot_0:'',
        uso_tqt: 'não', tqt_0:'', tqt_1:'',
        uso_svd: 'não', svd_0:'',svd_1:'',svd_2:''
      });
      loadLast(leito).then(setLast);
    }, [leito]);

    const handleChange = (e) => {
      const { name, value } = e.target;
      setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
      await addResposta(form);
      onClose();
    };

    const hasLast = Object.keys(last).length > 0;

    return e('div', { className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center' },
      e('div', { className: 'bg-white p-6 rounded w-full max-w-lg max-h-[90vh] overflow-auto' },
        e('h3', { className: 'text-xl mb-4' }, `Formulário ${leito}`),
        hasLast && e('div', { className: 'bg-gray-100 p-4 mb-4 rounded' },
          e('h4', { className: 'font-semibold mb-2' }, 'Resumo do dia anterior:'),
          Object.entries(last)
            .filter(([k,v]) => k !== 'leito' && v)
            .map(([k,v]) => {
              const labels = { data: 'Data', atendimento: 'Atendimento', nascimento: 'Nascimento',
                uso_cvc: 'CVC', uso_pai: 'PAI', uso_cdl: 'CDL', uso_tot: 'TOT', uso_tqt: 'TQT', uso_svd: 'SVD' };
              const label = labels[k] || k.replace(/_/g,' ');
              return e('p', { key: k, className: 'mb-1' }, `${label}: ${v}`);
            })
        ),
        hasLast && e('div', { className: 'mb-4' },
          e('label', { className: 'block mb-2 font-medium' }, 'Mesmo paciente do dia anterior?'),
          e('select', {
            name: 'samePatient', value: samePatient || '', onChange: e => setSamePatient(e.target.value),
            className: 'border p-1 w-full mb-4', required: true
          },
            e('option', { value: '' }, 'Selecione...'),
            e('option', { value: 'sim' }, 'Sim'),
            e('option', { value: 'não' }, 'Não')
          )
        ),
        (( !hasLast ) || samePatient ) && e(React.Fragment, null,
          ['data','atendimento','nascimento'].map(field => {
            const type = field === 'data' || field === 'nascimento' ? 'date' : 'text';
            const label = field === 'data' ? 'Data' : field === 'atendimento' ? 'Atendimento' : 'Nascimento';
            return e('label', { key: field, className: 'block mb-2' },
              `${label}:`,
              e('input', {
                type, name: field, value: form[field] || '',
                onChange: handleChange, className: 'border p-1 w-full',
                required: field !== 'data'
              })
            );
          }),
          ['cvc','pai','cdl','tot','tqt','svd'].map(prefix => {
            const labelsMap = {
              cvc: ['Data punção','Sitio','Indicação','Possível retirada?','Tentado periférico?'],
              pai: ['Data punção','Sitio','Possível retirada?'],
              cdl: ['Data punção','Sitio'],
              tot: ['Dia IOT'],
              tqt: ['Dia TQT','Dias de VM'],
              svd: ['Data de passagem','Motivo','Possível retirada?']
            };
            const labels = labelsMap[prefix];
            return e(React.Fragment, { key: prefix },
              e('label',{className:'block mb-2 font-medium'},`Em uso de ${prefix.toUpperCase()}?:`,
                e('select',{ name:`uso_${prefix}`, value: form[`uso_${prefix}`], onChange:handleChange, className:'border p-1 w-full mb-1' },
                  e('option',{ value:'não' },'Não'),
                  e('option',{ value:'sim' },'Sim')
                )
              ),
              form[`uso_${prefix}`] === 'sim' && labels.map((lbl,i) =>
                e('label',{ key:i, className:'block mb-2' }, `${lbl}:`,
                  e('input',{ name:`${prefix}_${i}`, value: form[`${prefix}_${i}`] || '', onChange: handleChange, className:'border p-1 w-full' })
                )
              )
            );
          }),
          e('div',{ className:'flex justify-end mt-4' },
            e('button',{ onClick: onClose, className:'mr-2 px-4 py-2' }, 'Cancelar'),
            e('button',{ onClick: handleSubmit, className:'px-4 py-2 bg-blue-600 text-white rounded' }, 'Salvar')
          )
        )
      )
    );
  }

  function App() {
    const [selected, setSelected] = useState(null);

    return e('div', { className: 'p-4' },
      e('h1',{ className:'text-2xl font-bold mb-4' }, 'Leitos da UTI'),
      e('div',{ className:'grid grid-cols-5 gap-4' },
        Array.from({ length: 10 }).map((_, i) =>
          e(LeitoCard, { key: i, leito: `L${i+1}`, onClick: () => setSelected(`L${i+1}`) })
        )
      ),
      selected && e(FormModal, { leito: selected, onClose: () => setSelected(null) })
    );
  }

  ReactDOM.createRoot(document.getElementById('root')).render(e(App));
})();