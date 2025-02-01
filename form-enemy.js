class EnemyForm extends Form {
    constructor() {
        super();
        this.shadowRoot.append(
            E('form', [
                E('div', [
                    E.prop('SD'),
                    E('b', [E.prop('HS'), E.prop('D')]),
                    E('b', [E.prop('A'), E.prop('HS', {no: true}), E.prop('D')]),
                    E('b', [E.prop('A'), E.prop('HS'), E.prop('D')])
                ]),
                E.radio(EnemyForm.present('general.png', 'General|一般', [0, 0, 0, '']), {name: 'enemy', value: [0, 0, 0, ''], checked: true}),
                E('article', 
                    E.radios(EnemyForm.enemies.map(([img, name, def, TD]) => ({
                        children: EnemyForm.present(img, name, def), 
                        value: def, dataset: {TD: TD ?? 0}
                    }) ), {name: 'enemy'}),
                )
            ])
        );
    }
    connectedCallback () {
        super.connectedCallback();
        this.el = {
            form: this.sQ('form'),
            article: this.sQ('article'),
        };
        this.events();
        this.sQ('data', data => data.value = data.value);
    }
    events () {
        this.el.form.onchange = this.dispatch;
        this.el.article.onwheel = ev => ev.preventDefault() || (this.el.article.scrollLeft += ev.deltaY)    ;
    }
    give () {
        let [SD, HSD, NHSAD, HSAD] = this.sQ(':checked').value.split(',').map(v => parseFloat(v));
        let TD = parseFloat(this.sQ(':checked').dataset.TD);
        return {SD, HSD, NHSAD, HSAD, TD};
    }
    static present = (img, name, def) => [
        E('img', {src: `buffs/${img}`}), 
        ...name.split('|').map(n => E('span', {innerHTML: n.replace(/[(（].+?[)）]/, '<small>$&</small>')})),
        ...def.map(value => E('data', {classList: 'def boost percent', value})), 
    ];
    static enemies = [
        ['berkas.webp', 'Tail|尾', [720, 200, 720, '']],
        ['berkas.webp', 'Legs|腳', [400, 200, 400, '']],
        ['berkas.webp', 'Torso|身', [200, 200, 200, '']],
        ['judgement.webp', 'Legs|腳', [551.05, 300/7, 4300/7, '']],
        ['judgement.webp', 'Torso|身', [30.21, 300/7, 300/7, '']],
        ['cloister.webp', 'Rofnus (Not healing)|洛普努斯（不回血時）', [30, 30, 30, '']],
        ['cloister.webp', 'Chaotic witch|渾沌魔女', [-20, '', -20, 0]],
        ['cloister.webp', 'Chaotic witch (purple shield)|渾沌魔女（紫盾）', [200, '', -60, -60]],
        ['cloister.webp', 'Chaotic witch (red shield)|渾沌魔女（紅盾）', [-50, '', 140, 140]],
        ['cloister.webp', 'Duell|杜爾', [200, '', 200, 0]],
        ['cloister.webp', 'Duell (casting failed)|杜爾（施展失敗）', [100, '', 100, 0]],
        ['abyssal.webp', 'Dominator|統治者', [200, '', 200, 0]],
        ['abyssal.webp', 'Dominator (casting failed)|統治者（施展失敗）', [0, '', 0, 0]],
        ['nightmare.webp', '4F', [500, '', 500, 0], 30],
        ['nightmare.webp', '4F (MP orbs)|4F（MP 球）', [20, '', 500, 0], 30],
        ['nightmare.webp', '4F (HP orbs)|4F（HP 球）', [500, '', -40, 0], 30]

        /*"Gorgos (1F)": [100, 300/7],
        "Gardosen (2F)": [100, 300/7],
        "Kamiki (3F)": [100, 300/7],
        "Gaikoz (4F)": [100, 300/7],
        "Kaze'aze (5F)": [150, 300/7],
        "First Gorgos (6F)": [100, 300/7],
        "Double Gorgos (6F)": [150, 200/3],
        "First Gaikoz (7F)": [100, 300/7],
        "Double Gaikoz (7F)": [100, 200/3],
        "First Kamiki (8F)": [100, 200/3],
        "Double Kamiki (8F)": [100, 200/3],
        "First Gardosen (9F)": [150, 200/3],
        "Double Gardosen (9F)": [150, 200/3],
        "Kaze'aze (10F)": [150, 200/3],*/
        // "Temple Guardian (weakened)": [-85, -80.80024575685431],
        // "Gaian": [25, 60], 
        // "Gaian (weakened)": [-50, -36],
        // "Voidal Gazer": [200, 284],
        // "Heart of the Absolute: bottom": [900, 1180],
        // "Heart of the Absolute (weakened): bottom": [700/3, 39.391472587273],
        // "Heart of the Absolute: top": [900, 1180],
        // "Heart of the Absolute (weakened): top": [700/3, 39.391472587273],
        // "Voidal Apostle 2F": [200, 284],
        // "Voidal Apostle 3F": [200, 284],
    ]
}
customElements.define('enemy-form', EnemyForm);
