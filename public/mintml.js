const CSS = `
    /* default styles for this framework */
    html, body { margin: 0px; overflow: hidden; height: 100%;}
    body { display: flex; flex-direction: column; }
    body > header { flex-shrink: 0;}
    main { flex: 1; min-height: 0; display: flex; flex-direction: column;}
    [data-page] { display: none; }
    [data-page=active] { display: flex; flex: 1; overflow: auto; }
    [data-page=active]#err_404 {
        background-color:white; position: absolute; width: 100vw; height: 100vh; margin: 0px; top: 0px; left: 0px; display: flex; align-items: center; justify-content: center; font-size: 40px;
    }
    [data-code] {margin-right: 10px; padding-right: 10px; border-right: 2px solid black;}
    .mintml-lib-hidden { display: none !important; }
`;

export const $ = q=>document.querySelector(q);
export const $$ = q=>[...document.querySelectorAll(q)];
export const $id = id=>document.getElementById(id);

const DATA_PAGE = '[data-page]';
const ACTIVE_PAGE = '[data-page=active]';
const DATA_BEFORE = '[data-before]';
const CSS_ID = 'mintml-app-css';


export default class MinTML{
    defaultPage = "";
    errorPageId = "";
    #beforeListeners = {};
    #currentRole;
    #showRoles = {};
    #roles;

    constructor({roles=[], preflightHandler=async ()=>true, errorPageId='err_404'}={}){
        // ADD THE CSS STYLE TO THE DOM
        if(!document.getElementById(CSS_ID)){
            const style = document.createElement('style');
            style.id = CSS_ID
            style.textContent = CSS;
            document.head.insertBefore(style, document.head.querySelector('link, style, script'));
        }
    
        // parse config object passed in
        this.errorPageId = errorPageId;
        this.roles = roles;
        this.render = Template.render.bind(Template);
        Template.remove();

        const beforeListenerContract = {
            element: null, 
            payload: null,
            params: null
        }
        
        // set up <a> BEFORE listeners
        document.addEventListener("click", (async e => {
            const link = e.target.closest(`a${DATA_BEFORE}`);
            if (!link) return;

            e.preventDefault();       
            const route = link.hash?.replace('#','');
            const data = Object.assign({}, beforeListenerContract, {element: link, params: queryStringParams(link.hash)});
            const fn = this.#beforeListeners[link.dataset.before] || (()=>true);
            if(await fn(data)){
                if(route){
                    this.navigate(route);
                }
            }
        }).bind(this));


        // set up <form> BEFORE listeners
        document.addEventListener('submit', (async e=>{
            const form = e.target.closest(`form${DATA_BEFORE}`);
            if (!form) return;

            e.preventDefault();
            const route = form.action.split('#')[1];
            const data = Object.assign({}, beforeListenerContract, {element: form, payload: form2Object(form), params: queryStringParams(form.action)});
            const fn = this.#beforeListeners[form.dataset.before] || (()=>true);
            if(await fn(data)){
                this.navigate(route);
            }
        }).bind(this));

        // ensure there is an "active" data-page
        const firstPage = $(DATA_PAGE);
        const activePage = $(ACTIVE_PAGE);
        const errorPage = $id(this.errorPageId);

        // if there are no pages... stop processing
        if(!firstPage) return;

        // create a 404 page if needed
        if(!errorPage){
            $('*:has(> section[data-page])').insertAdjacentHTML('beforeend', `
            <section id="err_404" data-page>
                <span data-code>404</span> <span data-message>Page Not Found</span>
            </section>`);
        }

        this.defaultPage = activePage;
        if(!this.defaultPage){
            this.defaultPage = firstPage;
            this.defaultPage.dataset.page = 'active';
        }
        
        // set up change listner
        window.addEventListener('hashchange', this.#processRoute.bind(this));
        this.#processRoute();
    }
    
    #processRoute(){
        // if(!await this.preflight(location.hash.replace('#',''))) return;
        const nextRoute = location.hash.length ? location.hash : `#${this.defaultPage.id}`;

        // // toggle active to previous and new route to active
        ($('[data-page=previous]')||{dataset:{page:""}}).dataset.page='';
        ($('[data-page=active]')||{dataset:{page:""}}).dataset.page='previous';
        // $$('[data-page=active]').forEach(page=>page.dataset.page="");
        try{$(nextRoute).dataset.page="active";}
        
        // // throw to 404 page if route isn't valid
        catch(e){$id(this.errorPageId).dataset.page="active";}
    }

    navigate(id){
        window.location = `#${id}`;
    }

    refresh(){
        this.#processRoute();
    }

    before(query, fn){
        this.#beforeListeners[query] = fn;
        return this;
    }

    // off(query){
    //     delete this.#beforeListeners[query];
    // }

    // fire(query, args={}){
    //     return this.#beforeListeners[query](args);
    // }

    get roles(){
        return [...this.#roles];
    }

    set roles(s=[]){
        this.#roles = s;
        this.#currentRole = s[0] || "";
        this.#showRoles = Object.fromEntries(s.map(role=>[role,[]]));

        if(!this.#roles.length && $('[data-show')){
            console.warn(
                "MinTML: data-show attributes found, but no roles configured. " +
                "Pass roles to new MinTML({ roles: [...] }) to enable role visibility. " + 
                "data-show attributes will be ignored."
            );
        }
        
        $$('[data-show]').forEach(el=>{
            el.dataset['show'].replace(/\s/g, "").split(',').forEach(key=>{       
                this.#showRoles[key]?.push(el);
            });
        });

        this.#roleManager();
    }

    get role(){
        return this.#currentRole;
    }

    set role(s){
        if(!this.#roles.includes(s)){
            throw new Error('The value you passed in is not a valid application role');
        }
        this.#currentRole = s;
        this.#roleManager();
    }

    #roleManager(){
        if(!this.roles.length) return;

         // hide all elements with a data-show attribute
        $$('[data-show]').forEach(el=>el.classList.add('mintml-lib-hidden'))
        
        // then remove the ones that match the users's current role
        this.#showRoles[this.#currentRole]?.forEach(el=>{
            el.classList.remove('mintml-lib-hidden');
        })
    }
}

export function form2Object(form){
    const formData = new FormData(form);
    return Object.assign({}, ...Object.keys(Object.fromEntries(formData)).map(key=>{
            const values = formData.getAll(key).map(k=>k.trim());
            return {[key]: values.length===1?values[0]:values};
        }));
}

function queryStringParams(string){
    const qs = Object.fromEntries(new URLSearchParams(string.split('?')[1]));
    return !Object.keys(qs).length? null : qs;
}

class Template{
    constructor(){
        throw new TypeError("Template is a static class and cannot be instantiated");
    }

    static templates = ((templates)=>{
        const result = Object.fromEntries(Array.from(templates).map(t=>[t.id, t]));
        // templates.forEach(t=>t.remove());
        return result;
    })($$('template'));

    static render(str, data={}){
        if (str instanceof HTMLTemplateElement) str = str.innerHTML;
        else if (typeof str === "string") str = this.templates[str]?.innerHTML ?? str;
        else throw new TypeError("Invalid template");
        return str.replace(/{{\s*(\w+)\s*}}/g,(_, key)=>data[key] ?? "").trim();
    }

    static remove(){
        Object.values(this.templates).forEach(t=>t.remove());
    }

    static has(id) {
        return id in this.templates;
    }
}