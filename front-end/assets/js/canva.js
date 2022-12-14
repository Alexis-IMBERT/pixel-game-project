const canvas = document.getElementById("canva");
const painting = $("#painting");
const ctx = canvas.getContext("2d", {willReadFrequently: true});
ctx.webkitImageSmoothingEnabled = false;
ctx.mozImageSmoothingEnabled = false;
ctx.imageSmoothingEnabled = false;

const image = new Image(100, 100); // Using optional size for image
image.onload = drawImageActualSize; // Draw when image has loaded

// Load an image of intrinsic size 300x227 in CSS pixels
image.src = "../../assets/imgs/img.jpg";

function drawImageActualSize() {
  // Use the intrinsic size of image in CSS pixels for the canvas element
  canvas.width = this.naturalWidth;
  canvas.height = this.naturalHeight;

  // Will draw the image as 300x227, ignoring the custom size of 60x45
  // given in the constructor
  ctx.drawImage(this, 0, 0);

  // To use the custom size we'll have to specify the scale parameters
  // using the element's width and height properties - lets draw one
  // on top in the corner:
  ctx.drawImage(this, 0, 0, this.width, this.height);
}


const canvaJQ = $("#canva")
let drag = false;
let zoomFactor = 0.15
var zoomValue = 4;
var lastPixelChangedX, lastPixelChangedY;
var lastPixelData, r, g, b;
var isWaiting = false;
var temps = 0;

$('#canva').css('transform', 'scale(' + zoomValue * zoomFactor + ')');

function getCursorPosition(canvas, event) {
    const rect = canvas.getBoundingClientRect()
    const x = Math.ceil((event.clientX - rect.left)/(zoomValue*zoomFactor))
    const y = Math.ceil((event.clientY - rect.top)/(zoomValue*zoomFactor))
    if(!isWaiting)
    {
        $('#info-picker').text("("+ y + ";" + x + ")");
        changerCouleurPixelLocal(canvas,x,y);
    }
}

function changerCouleurPixelLocal(canvas,x,y) {
    if (lastPixelData) 
        ctx.putImageData(lastPixelData, lastPixelChangedX-1, lastPixelChangedY-1);
    lastPixelData = ctx.getImageData(x-1,y-1,1,1);
    lastPixelChangedX = x;
    lastPixelChangedY = y;
    let data = ctx.getImageData(x-1,y-1,1,1);
    color = $(".color-picker").val();
    r = parseInt(color.substr(1,2), 16)
    g = parseInt(color.substr(3,2), 16)
    b = parseInt(color.substr(5,2), 16)
    data.data[0] = r
    data.data[1] = g
    data.data[2] = b 
    ctx.putImageData(data, x-1, y-1);
    $(".valid-btn").removeAttr("disabled");
}


function envoyerPixel(e) {
    e.preventDefault();
    lastPixelData = undefined;
    isWaiting = true;
    $('#info-picker').text("(0;0)");
    $(".valid-btn").attr("disabled", true);
    temps = 3;
    var chrono = setInterval(function () {
        let minutes = parseInt(temps / 60, 10);
        let secondes = parseInt(temps % 60, 10);

        minutes = minutes < 10 ? "0" + minutes : minutes;
        secondes = secondes < 10 ? "0" + secondes : secondes;

        $('#chronotime').text(`${minutes}:${secondes}`);
        temps -= 1;
        if (temps < 0) {
            clearInterval(chrono);
            isWaiting = false;
        }
    }, 1000);
}

document.addEventListener('mousedown', () => drag = false);
document.addEventListener('mousemove', () => drag = true);
$("form")  .on('submit', function(e)  {envoyerPixel(e)});
$("#print").on("click",  function(e)  { print('#canva', 'html') } ); //to fix
canvaJQ.on('mouseup', function(e) { if (!drag) getCursorPosition(canvas, e) });

/* ZOOM AND DRAG */
$( function() {
    $("#canva").draggable();
});

var zoom = function(clicks){
    if (clicks > 0) 
        zoomValue++;
    else if ((zoomValue-1)*zoomFactor > 0)
        zoomValue--;
        
    $('#canva').css('transform', 'scale(' + zoomValue * zoomFactor + ')');  
}

var handleScroll = function(evt){
    var delta = evt.wheelDelta ? evt.wheelDelta/40 : evt.detail ? -evt.detail : 0;
    if (delta) zoom(delta);
    return evt.preventDefault() && false;
};

painting.on('wheel', function(evt){
    handleScroll(evt.originalEvent);
});
