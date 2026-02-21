export type UQLQuery={
    table:string,
    action:"find",
    filter?:{
        [field:string]:{
            gt?:number,
            lt?:number,
            eq?:string | number;
        }
    }
}