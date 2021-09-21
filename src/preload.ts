

console.log("👋 This message is being logged by \"renderer.js\", included via webpack");

window.addEventListener("load",async e=>{
    const { render } = await import("./react");

    render();
});

