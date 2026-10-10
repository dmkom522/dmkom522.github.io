(()=>{let theme="light";try{if(localStorage.getItem("blog-theme")==="dark")theme="dark";}catch{}document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;})();
