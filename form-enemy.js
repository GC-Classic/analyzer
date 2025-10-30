import Form from './form.js'
class EnemyForm extends Form {
    constructor() {
        super();
        this.shadowRoot.append(EnemyForm.DOM());
    }
    connectedCallback () {
        super.connectedCallback();
        this.el = this.ref();
        this.events();
        this.sQ('data', data => data.value = data.value);
    }
    events () {
        this.el.form.onchange = () => {
            this.dispatch('request', 'buffForm', form => form.unlock());
            this.dispatch('calculate');
        }
        this.el.article.onwheel = ev => {
            ev.preventDefault();
            this.el.article.scrollLeft += ev.deltaY;
        }
    }
    give () {
        let checked = this.sQ(':checked');
        let {def, ...others} = JSON.parse(checked.value);
        !checked.matches('.unset') && (others.TD ||= 0, others.enemyLv ||= 85);
        let [SD, HSD, NHSAD, HSAD] = def;
        return {SD, HSD, NHSAD, HSAD, settings: others};
    }
    static DOM = () => 
        E('form', [
            E('div', [
                E.icon('SD'),
                E('b', [E.icon('HS'), E.icon('D')]),
                E('b', [E.icon('A'), E.icon('HS', {no: true}), E.icon('D')]),
                E('b', [E.icon('A'), E.icon('HS'), E.icon('D')])
            ]),
            E.radio({
                label: EnemyForm.present('general.png', 'General|一般', [0, 0, 0, '']), 
                name: 'enemy', value: JSON.stringify({def: [0, 0, 0, '']}), classList: 'unset', checked: true
            }),
            E('article', 
                E.radios(EnemyForm.enemies.map(([img, name, def, extra]) => ({
                    label: EnemyForm.present(img, name, def), 
                    value: JSON.stringify({def, boss: true, ...extra}), name: 'enemy'
                }) )),
            )
        ]);
    ref = () => ({
        article: this.sQ('article'),
        form: this.sQ('form'),
        unset: this.sQ('.unset'),
    });
    static present = (img, name, def) => [
        E('img', {src: `buffs/${img}`}), 
        ...name.split('|').map(n => E('span', {innerHTML: n.replace(/[(（].+?[)）]/, '<small>$&</small>')})),
        ...def.map(value => E('data.def.ante.percent', {value})), 
    ];
    static enemies = [
        ['berkas.webp', 'Tail|尾', [1400, 200, 1400, '']],
        ['berkas.webp', 'Legs|腳', [400, 200, 400, '']],
        ['berkas.webp', 'Torso|身', [200, 200, 200, '']],
        ['judgement.webp', 'Legs|腳', [551.045, 3/7*100, 43/7*100, '']],
        ['judgement.webp', 'Torso|身', [30.2084, 3/7*100, 3/7*100, '']],
        ['cloister.webp', 'Rofnus (Not healing)|洛普努斯（不回血時）', [30, '', 30, 0], {boss: false}],
        ['cloister.webp', 'Chaotic witch|渾沌魔女', [-20, '', -20, 0], {boss: false}],
        ['cloister.webp', 'Chaotic witch (purple shield)|渾沌魔女（紫盾）', [200, '', -60, -60], {boss: false}],
        ['cloister.webp', 'Chaotic witch (red shield)|渾沌魔女（紅盾）', [-50, '', 140, 140], {boss: false}],
        ['cloister.webp', 'Duell|杜爾', [200, '', 200, 0]],
        ['cloister.webp', 'Duell (casting failed)|杜爾（施展失敗）', [100, '', 100, 0]],
        ['abyssal.webp', 'Dominator|統治者', [200, '', 200, 0]],
        ['abyssal.webp', 'Dominator (casting failed)|統治者（施展失敗）', [0, '', 0, 0]],
        ['nightmare.webp', '4F', [500, '', 500, 0], {TD: 20}],
        ['nightmare.webp', '4F (MP orbs)|4F（MP 球）', [20, '', 500, 0], {TD: 20}],
        ['nightmare.webp', '4F (HP orbs)|4F（HP 球）', [500, '', -40, 0], {TD: 20}]

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
export default EnemyForm
