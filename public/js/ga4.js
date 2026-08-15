
export default class GA4{
    static instance;

    constructor(measurementId){
        // make the class a singleton
        if(GA4.instance) return GA4.instance;
        GA4.instance = this;

        // turn off analytics on development
        this.enabled = !/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
        if (!this.enabled) return;

        // add google analytics to the page
        let s = document.createElement('script');
        s.async = true;
        s.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
        document.head.appendChild(s);

        // initialize google analytics
        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function(){window.dataLayer.push(arguments)};
        window.gtag('js', new Date());
        window.gtag('config', measurementId, { send_page_view: false })
        
        // send "page view" to google
        window.addEventListener('hashchange', e=>{
            this.event('page_view', {
                page_title: document.title,
                page_location: location.href,
                page_path: location.hash || '/'
            })
        });
    }

    event(name, params = {}) {
        if (!this.enabled) return;
        window.gtag('event', name, params);
    }
}


