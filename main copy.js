class Cleaner{
    cleanStatement(sql){
        return  sql.trim()
                    .trimStart("(")
                    .trimEnd(")")
                    .split("\n").join(" ")
                    .split(/\s+/).join(" ")
                    .split(/ as /ig).join(" AS ")
                    .split(/\( select/ig).join("(select")
    }
}


class Eloquent{
    constructor(sql){
        this.sql = sql
    }

    process(){
        this.code = this.sql.split(" ").join("::")
    }

}

// class Query extends Cleaner{
//     constructor(sql){
//         super()
//         this.sql = sql
//     }

//     process(){
//         this.sql = this.cleanStatement(this.sql)
//         let disector = new Disector(this.sql)
//         disector.process()
//         this.subqueries = disector.subqueries
//         let eloquent = new Eloquent(disector.modified_sql);
//         eloquent.process()
//         this.eloquent = eloquent.code
//     }
// }


class Disector extends Cleaner{
    constructor(sql){
        super()
        this.sql = sql
        this.subqueries = []
        this.sub_clause = ""
        this.index = 0
    }

    process(){
        this.sql = this.cleanStatement(this.sql)
        this.getSubquery()
        this.query = this.eloquentize(this.sql)
    }

    eloquentize(sql){
        let query = new Query(sql)

        query.process()

        return query
    }

    getSubquery(){
        let str = this.sql
        const regex = / \(.+\) AS /gm;
        let matches;

        while ((matches = regex.exec(str)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (matches.index === regex.lastIndex) {
                regex.lastIndex++;
            }

            for(let x in matches){
                if(isNaN(x)){
                    continue
                }
                let match = matches[x]

                if(!match.toLowerCase().includes("(select")){
                    match = ""
                }
        
                this.sub = match
        
                this.getSubName()
                
                this.modifySql()

                let query = ""

                if(match != ""){
                    query = new Query(this.sub_clause)
                    this.subqueries.push({
                        sql : this.sub,
                        clause: this.sub_clause,
                        name: this.sub_name,
                        query: query
                    })
                }

                
            }
        }
    }

    getSubName(){
        if(this.sub.trim() != ""){
            this.sub_name = this.sql
                            .split(this.sub)[1]
                            .split(" ")[0]

            this.sub_clause = this.sub + this.sub_name

            this.sub_name = this.sub_name.trim()

            if(this.sub_name.slice(-1) == ","){
                this.sub_name = this.sub_name.replace(/.$/, '')
            }

            this.cleanSubName()
        }

    }

    cleanAliasCondition(wrapper){
        return this.sub_name.charAt(0) == `${wrapper}` && this.sub_name.slice(-1) == `${wrapper}`
    }

    cleanSubName(){
        let wrappers = ["'", '"', '`']
        for(let wrapper of wrappers){
            if(this.cleanAliasCondition(wrapper)){
                this.sub_name = this.sub_name.substring(1).replace(/.$/, '')
                break
            }
        }
    }

    modifySql(){
        let modified = this.sql.split(this.sub).join("")
        if(this.sub_clause.trim().slice(-1) == ","){
            modified = this.sql.split(this.sub).join(` subquery${this.index}, `)
        }
        this.modified_sql = modified
    }
    
}


function disect(sql){
    let disector = new Disector(sql)
    disector.process()

    return disector
}


function convert(){
    let input = document.getElementById('input').value

    let data = disect(input)

    console.log(data)
}