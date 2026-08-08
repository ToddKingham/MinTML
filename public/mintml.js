const CSS = `
    /* default styles for this framework */
    html, body { margin: 0px; overflow: hidden; height: 100%;}
    body { display: flex; flex-direction: column; }
    body > header { flex-shrink: 0;}
    main { flex: 1; min-height: 0; display: flex; flex-direction: column;}
    [data-page] { display: none; }
    [data-page=active] { display: flex; flex: 1; overflow: auto; }
    [data-page=active]#mintml-404 {
        background-color:white; position: absolute; width: 100vw; height: 100vh; margin: 0px; top: 0px; left: 0px; display: flex; align-items: center; justify-content: center; font-size: 40px;
    }
    [data-code] {margin-right: 10px; padding-right: 10px; border-right: 2px solid black;}
    .mintml-lib-hidden { display: none !important; }
`;

const DATA_PAGE = '[data-page]';
const ACTIVE_PAGE = '[data-page=active]';
const DATA_BEFORE = '[data-before]';
const CSS_ID = 'mintml-app-css';


export default class MinTML{
    #preflightHandler = ()=>true;
    #defaultPageId = "";
    #errorPageId = "";
    #beforeListeners = {};
    #currentRole;
    #showRoles = {};
    #roles;
    #templates = {};
    
    constructor({roles=[], errorPageId='mintml-404'}={}){
        // parse config object passed in
        this.#errorPageId = errorPageId;
        this.roles = roles;
        
        this.#initCSS();
        this.#initNavigation();
        this.#initPages(errorPageId);
        this.#initTemplates();
    }

    #initCSS(){
        if(!document.getElementById(CSS_ID)){
            const style = document.createElement('style');
            style.id = CSS_ID
            style.textContent = CSS;
            document.head.insertBefore(style, document.head.querySelector('link, style, script'));
        }
    }

    #initNavigation(){
        const beforeListenerContract = {
            element: null, 
            payload: null,
            params: null
        }

        const navigationHandler = async ({e, element, route, data})=>{
            e.preventDefault(); 
            
            const beforeHandler = this.#beforeListeners[element.dataset.before] || (()=>true);

            // run the preflight check
            if(await this.#preflightHandler(data)){
                // if preflight passes do we need to run the "before" check?
                if(e.target.closest(`${DATA_BEFORE}`)){
                    // run the "before" check
                    if(await beforeHandler(data)){
                        if(route){
                            this.navigate(route);
                        }
                    }
                }
                else {
                    if(route){
                        this.navigate(route);
                    }
                }
            }
             
        }
        
        document.addEventListener("click", (async e => {
            const element = e.target.closest(`a[href^="#"]`);
            if (!element) return;

            const route = element.hash?.replace('#','');
            const data = Object.assign({}, beforeListenerContract, {element, params: queryStringParams(element.hash)});
            await navigationHandler({e, element, route, data});
        }).bind(this));

        document.addEventListener('submit', (async e=>{
            const element = e.target.closest(`form`);
            if (!element) return;

            const route = element.action.split('#')[1];
            const data = Object.assign({}, beforeListenerContract, {element, payload: form2Object(element), params: queryStringParams(element.action)});
            await navigationHandler({e, element, route, data});    
        }).bind(this));
    }

    #initPages(){
        // ensure there is an "active" data-page
        const firstPage = $(DATA_PAGE);
        const activePage = $(ACTIVE_PAGE);
        const errorPage = $id(this.#errorPageId);
        const defaultPage = activePage || firstPage;

        // if there are no pages... stop processing
        if(!firstPage) return;

        // create a 404 page if needed
        if(!errorPage){
            $('*:has(> section[data-page])').insertAdjacentHTML('beforeend', `
            <section id="mintml-404" data-page>
                <span data-code>404</span> <span data-message>Page Not Found</span>
            </section>`);
        }

        // set the default page flag just incase it's not hardcoded
        console.log(defaultPage);
        defaultPage.dataset.page = "active";
        this.#defaultPageId = defaultPage.id;
       
        
        // set up change listner
        window.addEventListener('hashchange', this.#processRoute.bind(this));
        this.#processRoute();
    }

    #initTemplates(){
        this.#templates = Object.fromEntries(Array.from($$('template')).map(t=>[t.id, t]));
        Object.values(this.templates).forEach(t=>t.remove());
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
    
    async #processRoute(){
        const nextRoute = location.hash.length ? location.hash : `#${this.#defaultPageId}`;

        // // toggle active to previous and new route to active
        ($('[data-page=previous]')||{dataset:{page:""}}).dataset.page='';
        ($('[data-page=active]')||{dataset:{page:""}}).dataset.page='previous';
        // $$('[data-page=active]').forEach(page=>page.dataset.page="");
        try{$(nextRoute).dataset.page="active";}
        
        // // throw to 404 page if route isn't valid
        catch(e){$id(this.#errorPageId).dataset.page="active";}
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

    preflight(fn){
        this.#preflightHandler = fn;
    }

    render(str, data={}){
        if (str instanceof HTMLTemplateElement) str = str.innerHTML;
        else if (typeof str === "string") str = this.#templates[str]?.innerHTML ?? str;
        else throw new TypeError("Invalid template");
        return str.replace(/{{\s*(\w+)\s*}}/g,(_, key)=>data[key] ?? "").trim();
    }

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

    get templates(){
        return this.#templates;
    }
}

// helper functions
export const $ = q=>document.querySelector(q);
export const $$ = q=>[...document.querySelectorAll(q)];
export const $id = id=>document.getElementById(id);

export function form2Object(form){
    const formData = new FormData(form);
    return Object.assign({}, ...Object.keys(Object.fromEntries(formData)).map(key=>{
            const values = formData.getAll(key).map(k=>k.trim());
            return {[key]: values.length===1?values[0]:values};
        }));
}

export function queryStringParams(string){
    const qs = Object.fromEntries(new URLSearchParams(string.split('?')[1]));
    return !Object.keys(qs).length? null : qs;
}