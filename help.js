const Damage = ({A, SA, CAC, CAD, BAP, BAD, HSC, HS: HSD, TD, TR, Lv, enemyLv, coef, buffs}, def, special = false) => {
    CAC += buffs?.CAC || 0; CAD += buffs?.CAD || 0; BAD += buffs?.BAD || 0;
    def = {...def}; def.SD /= 100; def.HSD &&= def.HSD / 100; def.NHSAD /= 100; def.HSAD &&= def.HSAD / 100;
    buffs.A /= 100; 

    special == 'normal' && (special = false);
    let NTD = Math.max(TD - TR, 0)/100;
    let seniority = Math.max(Lv - enemyLv - 5, 0);

    let HS = {
        c: HSC/100,
        d: HSD * (1 + buffs.HS/100) * (1 - NTD) * (1 - special) / (1 + (def.HSD || 0))
    };
    let CA = {
        c: Math.min(1, Math.max(CAC/100, 0)),
        m: Math.max(1, 1.5 + CAD/100)
    };
    let BA = {
        c: BAP/100,
        m: Math.max(1, 1.3 + BAD/100)
    };
    let base = Damage[special ? 'special' : 'normal'](A, SA, coef, NTD, seniority, buffs, {SD: def.SD});
    let matrix;
    if (special) {
        matrix = [
            base,        null, base * CA.m,        null, 
            base * BA.m, null, base * BA.m * CA.m, null, 
        ];
    } else if (def.HSD) {
        base /= (1 + def.NHSAD);
        matrix = [
            base,        base + HS.d,        base * CA.m,        base * CA.m + HS.d, 
            base * BA.m, base * BA.m + HS.d, base * BA.m * CA.m, base * BA.m * CA.m + HS.d, 
        ];
    } else {
        matrix = [
            base / (1 + def.NHSAD),        (base + HS.d) / (1 + def.HSAD),        base * CA.m / (1 + def.NHSAD),        (base * CA.m + HS.d) / (1 + def.HSAD),
            base * BA.m / (1 + def.NHSAD), (base * BA.m + HS.d) / (1 + def.HSAD), base * BA.m * CA.m / (1 + def.NHSAD), (base * BA.m * CA.m + HS.d) / (1 + def.HSAD)
        ];
    }
    return [...matrix, Damage.average(matrix, special ? 0 : HS.c, CA.c, BA.c)];
}
Object.assign(Damage, {
    normal: (A, SA, coef, NTD, seniority, buffs) =>
        A * .0168 * coef * (1 + buffs.A) * (1 + seniority/50) * (1 - NTD),

    special: (A, SA, coef, NTD, seniority, buffs, def) =>
        (A + SA) * .005469 * coef / (1 + def.SD) * (1 + buffs.A) * (1 + seniority/50) * (1 - NTD),

    average: ([A, HSA, CA, CHSA, BA, HSBA, CBA, CHSBA], HSc, CAc, BAc) =>
            A*(1-HSc)*(1-CAc)*(1-BAc) +   HSA*(HSc)*(1-CAc)*(1-BAc)
        +  CA*(1-HSc)*  (CAc)*(1-BAc) +  CHSA*(HSc)*  (CAc)*(1-BAc)
        +  BA*(1-HSc)*(1-CAc)*  (BAc) +  HSBA*(HSc)*(1-CAc)*  (BAc)
        + CBA*(1-HSc)*  (CAc)*  (BAc) + CHSBA*(HSc)*  (CAc)*  (BAc)
});
const RunePicker = () => {
    RunePicker.aside = Q('aside');
    RunePicker.secondary.levels = Q('aside #secondary+form input'),

    RunePicker.build(['tier', 'grade', 'level', 'secondary', 'set']);
    RunePicker.aside.onchange = ev => {
        if (ev.target.type == 'checkbox') {
            if (RunePicker.aside.Q('[type=checkbox]:checked')?.length > 3)
                return ev.target.checked = false;
            RunePicker.secondary[ev.target.checked ? 'add' : 'remove'](ev.target.labels[0]);
        }
        RunePicker.read();
    };
    RunePicker.aside.onwheel = ev => ev.preventDefault() || (RunePicker.aside.scrollLeft += ev.deltaY);

    Q('main').onclick = ev => {
        if (ev.target.id || ev.target.htmlFor) return;
        RunePicker.aside.classList.remove('remind');
        RunePicker.focus?.classList.remove('focus');
        RunePicker.focus = null;
    }
};
Object.assign(RunePicker, {
    build (which, param) {
        Array.isArray(which) ? 
            which.forEach(w => this.build(w)) : 
            this.aside.Q(`#${which}`).replaceChildren(
                ...E[which == 'secondary' ? 'checkboxes' : 'radios'](param ? this.build[which](param) : this.build[which], {name: which})
            );
    },
    reset () {
        [this.aside.Q('input:checked') ?? []].flat().forEach(input => input.checked = false);
        [this.aside.Q('label[class]') ?? []].flat().forEach(label => label.classList = '');
        this.aside.Q('input:not([type])', input => input.value = '');
        this.focus?.classList.remove('focus');
    },
    set (ev) {
        this.reset();
        this.focus = ev.target;
        this.focus.classList.add('focus');
        let rune = ev.target.labels[0].firstChild?.rune ?? {shape: ev.target.id.split('-')[1]};
        this.aside.classList.add('remind');
        this.build('primary', rune.shape);
        if (!rune.primary) return;

        let aspects = (({tier, set, primary: {level, prop: primary}}) => ({tier, set, level, primary}))(rune);
        Object.entries(aspects).forEach(([a, v]) => (v || v === 0) && (this.aside.Q(`#${a} [value='${v}']`).checked = true));
        this.aside.Q(`#grade label:nth-child(${rune.grade+1}) input`).checked = true;
        rune.secondary.forEach(({prop, level}, i) => {
            let input = this.aside.Q(`#secondary [value=${prop}]`);
            input.checked = true;
            this.secondary.outline(input.labels[0], i);
            this.secondary.levels[i].value = `+${level}`;
        });
    },
    read () {
        this.focus.value = `T${this.get('tier', 'grade')}+${this.get('level', 'primary')}(${this.secondary()}){${this.get('set')}}`;
        let RuneForm = this.focus.getRootNode().host;
        RuneForm.changeRune(this.focus);
        RuneForm.dispatch('calculate');
    },
    get (...which) {
        return which.length > 1 ? which.map(w => this.get(w)).join('') : this.aside.Q(`#${which} :checked`)?.value || '';
    },
    secondary (c, i) {
        if (!c && !i)
            return this.secondary.order.map((c, i) => this.secondary(c, i)).filter(v => v);
        let prop = this.aside.Q(`#secondary .${c} :checked`)?.value;
        if (!prop) 
            return null;
        let reinforce = this.secondary.levels[i].value;
        reinforce = reinforce == '+0' ? '' : reinforce == '+1' ? "'" : reinforce == '+2' ? '"' : reinforce;
        return prop + reinforce;
    },
});
Object.assign(RunePicker.build, {
    tier : [1,2,3,4,5].map(t => ({children: `T${t}`, value: t}) ),
    grade: ['Common|普通','Rare|稀有','Epic|史詩','Legend|傳說'].map(g => ({children: E.bilingual(g), value: g[0]}) ),
    level: [...Array(11)].map((_, l) => ({children: `+${l}`, value: l}) ),
    set  : Rune.set.flat().map(s => ({children: E('img', {src: `/rune/set/${s}.webp`}), value: s}) ),
    primary: shape => Rune.primary[shape].map(p => ({children: E.prop(p), value: p}) ),
    secondary: Object.keys(Rune.secondary).map(p => ({children: E.prop(p), value: p, name: 'secondary'}) )

});
Object.assign(RunePicker.secondary, {
    order: ['blue','lime','red'],
    outline (label, c) {label.classList = c != null ? typeof c == 'string' ? c : this.order[c] : ''},
    add (label) {
        let c = this.order.find(c => !RunePicker.aside.Q(`#secondary .${c}`));
        this.outline(label, c);
    },
    remove (label) {
        let i = this.order.findIndex(c => c == label.classList);
        this.outline(label);
        this.levels[i].value = '';
    }
});
const Help = {
    '[name=name]': [
        `Enter character name for your own identification`,
        `輸入角色名稱作自己的記認`
    ],
    '[type=color]': [
        `Set the color so that you can drag the 'Jump to' in the upper left for a shortcut`,
        `設定顏色後能拉動左上角「跳至」作捷徑`
    ],
    'label:has(#toggle-mode)': [
        `Rune: Analyze the effects of switching runes. Diff: Analyze the effects of switching a property or equipment.`,
        `符文：分析更換符文後的變化。差異：分析更換裝備、屬性等的變化`
    ],
    '.formula': [
        `Enter the changes here. Formula supported (e.g. 5.03*2).`,
        `輸入數値的改變。支援算式（如 5.03*2）`
    ],
    ':host(char-form) [type=number]': [
        `Enter the stats of your character`,
        `輸人你角色的能力`
    ],
    ':host(char-form) data.ante': [
        `Changes brought by switching runes`,
        `更換符文帶來的變化`
    ],
    'output': [
        `New value, all changes included`,
        `新的數値，已包括所有改變`
    ],
    'output+data': [
        `Change in the new value compared to old value`,
        `新數値比舊數値的變化`
    ],
    'img[alt=TD]': [
        `Taint debuff in effect`,
        `侵蝕減益生效中`
    ],
    'b img[alt=TD]~*': [
        `Updated damage buff`,
        `最新傷害增益`
    ],
    '[name=boss]': [
        `Check if you have set the enemies below`,
        `檢查下面對象有否設定`
    ],
    'label:has([name=BAP])': [
        `Please estimate the proportion of back attacks. Default: 20%.`,
        `請估計你背擊次數的比例（預設 20%）`
    ],
    'section b': [
        `Enter extra damage buff here, such as increase in attack in fatal status etc`,
        `輸入其他傷害增益，如 Fatal 時攻擊力提升等`
    ],
    ':host(rune-form) .post': [
        `Change in total attack assuming only this rune is switched while others remain unchanged. Note that set effects are not included`,
        `假設只更換此符文、其他符文保持不變下帶來的戰力改變。注意不包括套裝效果`
    ],
    'label:has([id|=switch])': [
        `Enable or disable the rune switch`,
        `開啟或關閉符文更換`
    ],
    '[id|=to]': [
        `You can find your input history in the select menu. To delete an option, first select it and then clear the input field.`,
        `在選單中可找到輸入歷史。如要刪除某選項，先選擇它再清空輸入欄`
    ],
    '#secondary+form input': [
        `Enter the number of times reinforced (e.g. +1) or the actual value (e.g. 1.46)`,
        `輸入強化過的次數（例：+1）或實際數値（例：1.46）`
    ],
    ':host(enemy-form) b:nth-of-type(1)': [
        `Defense against the component of hell spear damage`,
        `對地獄之矛部分傷害的防禦`,
    ],
    ':host(enemy-form) b:nth-of-type(2)': [
        `Defense against normal attack without hell spear activated`,
        `對沒有發動地獄之矛的一般攻擊的防禦`,
    ],
    ':host(enemy-form) b:nth-of-type(3)': [
        `Defense against normal attack with hell spear activated`,
        `對有發動地獄之矛的一般攻擊的防禦`,
    ],
    ...Object.fromEntries(Object.entries(Icon.en).map(([prop, en]) => [`prop-icon[prop=${prop}]`, [en, Icon.zh[prop]]])),
    ...Object.fromEntries(Object.entries(Rune.set.zh).map(([en, zh]) => [`img[alt=${en}]`, [en, zh]]))
}
Object.defineProperties(Help, {
    cursor: {
        value: (where = document) => where.Q(Object.keys(Help), el => el.classList.add('help')),
    },
    event: {
        value: (where = window, inner = false) => where.addEventListener('contextmenu', ev => {
            inner && ev.stopPropagation();
            ev.preventDefault();
            where.dispatchEvent(new CustomEvent('help', {
                detail: {target: ev.target, x: ev.clientX, y: ev.clientY}, 
                composed: true
            }));
        }),
    },
    show: {
        value: ({target, x, y}) => {
            let content = Object.entries(Help).find(([selector]) => target.closest('.help')?.matches(selector))?.[1];
            if (!content) return;
            Help.dialog ?? Object.defineProperty(Help, 'dialog', {value: Q('dialog')});
            Help.dialog.replaceChildren(...content.map(text => E('span', text)));
            Help.dialog.showModal();
            Help.dialog.style.left = `${Math.min(x, innerWidth - 200)}px`;
            Help.dialog.style.top = `${y}px`;
        },
    }
});
