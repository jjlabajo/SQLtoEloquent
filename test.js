class Query{
    constructor(sql){
        this.sql = sql
    }

    process(){
        this.eloquent = ""
        this.cleanStatement()
        let subquery = new SubQuery(this.sql)
        subquery.getSubQueries()
        this.subqueries = subquery.subqueries
    }

    cleanStatement(){
        this.sql = this.sql.trim()

        console.log(this.sql)

        if(this.sql.charAt(0) == "(" && this.sql.slice(-1) == `)`){
            console.log('yes')
            this.sql = this.sql.substring(1).replace(/.$/, '')
        }


        this.sql = this.sql
                    .split("\n").join(" ")
                    .split(/\s+/).join(" ")
                    .split(/ as /ig).join(" AS ")
                    .split(/\( select/ig).join("(select")
    }

    trimStart(){

    }
}

class SubQuery{
    constructor(sql){
        this.sql = sql
        this.name = ""
        this.clause = ""
        this.sub = ""
        this.subqueries = []
    }

    getSubQueries(){
        const regex = / \(.+\) AS /gm;
        let matches;

        while ((matches = regex.exec(this.sql)) !== null) {
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

                this.getSubQueryName()

                let query = new Query(this.sub.split(" AS ").join(""))
                query.process()

                this.subqueries.push({
                    name: this.name,
                    query: query
                })

            }
        }

    }

    getSubQueryName(){
        if(this.sub.trim() != ""){
            this.name = this.sql
                            .split(this.sub)[1]
                            .split(" ")[0]

            this.clause = this.sub + this.name

            this.name = this.name.trim()

            if(this.name.slice(-1) == ","){
                this.name = this.name.replace(/.$/, '')
            }

            this.cleanSubName()
        }

    }

    cleanAliasCondition(wrapper){
        return this.name.charAt(0) == `${wrapper}` && this.name.slice(-1) == `${wrapper}`
    }

    cleanSubName(){
        let wrappers = ["'", '"', '`']
        for(let wrapper of wrappers){
            if(this.cleanAliasCondition(wrapper)){
                this.name = this.name.substring(1).replace(/.$/, '')
                break
            }
        }
    }

}

let sql = `SELECT DISTINCT
l.id,
l.for_commission,
s.name,
u.first_name,
u.last_name,
c.name AS 'campaign',
q.label AS 'status',
p.name AS 'platform',
li.value AS 'listing_title',
CONCAT(ugh.first_name, ' ', ugh.last_name) AS 'qualifier',
l.qflag_id,
l.user_id,
(SELECT 
        COUNT(*)
    FROM
        general_history
    WHERE
        ui_type = 'ver' AND listing_id = l.id
            AND field IN ('user_id' , 'campaign_id')) AS 'no_of_reassignment',
l.url,
l.platform_id,
l.campaign_id,
cases.case_number,
s.url AS seller_url,
gh.id AS gh_id
FROM
listings l
    LEFT JOIN
sellers s ON l.seller_id = s.id
    LEFT JOIN
users u ON l.user_id = u.id
    LEFT JOIN
campaigns c ON l.campaign_id = c.id
    LEFT JOIN
qflag q ON l.qflag_id = q.id
    LEFT JOIN
platforms p ON l.platform_id = p.id
    LEFT JOIN
listing_info li ON l.id = li.listing_id
    AND field = 'listing_title'
    LEFT JOIN
general_history gh ON ui_type = 'ver' AND l.id = gh.listing_id
    AND (gh.action = 'update'
    OR gh.action = 'Change Status')
    AND (gh.field = 'qflag_id'
    OR gh.field = 'rh-migration')
    AND gh.value = '3'
    LEFT JOIN
users ugh ON ugh.id = l.qa_user_id
    LEFT JOIN
cases ON cases.id = l.case_id
WHERE
l.qflag_id = '4'
    AND l.deleted_at IS NULL
    AND l.campaign_id = '655'
GROUP BY l.id
ORDER BY l.id DESC`

let query = new Query(sql);
query.process()
console.log(query)
