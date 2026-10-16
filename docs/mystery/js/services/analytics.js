const validMeasurementId=value=>/^G-[A-Z0-9]+$/.test(value??'');
const validPuzzleId=value=>['q1','q2','q3','q4'].includes(value);

export function createAnalytics({measurementId='',documentRef=globalThis.document,windowRef=globalThis.window}={}){
  let initialized=false;

  function initialize(){
    if(initialized||!validMeasurementId(measurementId)||!documentRef||!windowRef)return false;
    try{
      windowRef.dataLayer=windowRef.dataLayer||[];
      windowRef.gtag=windowRef.gtag||function(){windowRef.dataLayer.push(arguments)};
      windowRef.gtag('js',new Date());
      windowRef.gtag('config',measurementId,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false});
      const script=documentRef.createElement('script');
      script.async=true;
      script.src=`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
      documentRef.head.append(script);
      initialized=true;
      return true;
    }catch{
      return false;
    }
  }

  return Object.freeze({
    trackPuzzleView(puzzleId){
      if(!validPuzzleId(puzzleId)||!initialize())return false;
      try{
        windowRef.gtag('event','puzzle_view',{puzzle_id:puzzleId});
        return true;
      }catch{
        return false;
      }
    }
  });
}
