function convertSQL(input, is_subquery = false){
    input = input.toLowerCase().trim();
    input = input.replace(/;/g,"");
    input = input.replace(/,/g,", ");
    input = input.replace(/in\(/g,"in (");
    input = input.replace(/(\r\n|\n|\r)/gm, " ");
    input = input.replace(/\s+/gm, " ");

    if(is_subquery){ //if subquery remove trailing parentheses
        input = input.trim().replace(/^\(/g,"").replace(/\)$/g,"")
    }

    //get all case when as selectRaw
    var get_all = getAll(/case when (.+?) end (.+?)`(.+?)`/g, input)
    select_raws = get_all.matches
    input = get_all.input

    //get all subqueries and functions on select
    get_all = getAll(/(([a-z]|[a-z]_[a-z])+?| )\(.+?\)( | as)`.+?`/g, input, "select_subquery_function")
    input = get_all.input
    select_subqueries_functions = get_all.result

    //get all subqueries and grouped clauses on where
    get_all = getAll(/( *?\(.+?\))/g, input, "where_subquery_group")
    input = get_all.input
    where_subqueries_groups = get_all.result


    //clean whitespaces again
    input = input.replace(/\s+/gm, " ");

    //divide the sql statement using the wildcards
    var parts = input.split(/select | from | where | order by | limit /)

    var composition = {
        select : parts[1] ?? "",
        from : parts[2] ?? "",
        where : parts[3] ?? "",
        order_by : parts[4] ?? "",
        limit : parts[5] ?? ""
    }

    return compose(composition, select_raws, select_subqueries_functions, where_subqueries_groups, is_subquery)

    //test sql statement
    return input
}

function compose(composition, select_raws, select_subqueries_functions, where_subqueries_groups, is_subquery){
    var w = where_subqueries_groups
    var composed = [] //init

    var table = ""
    var delimiter = "\n"

    console.log(composition)

    //get table name
    table = composition.from.split(/left join|right join|inner join|full join|join/)[0].trim()
    if(is_subquery){ //if subquery conditions
        composed.push(`$query->from('${table}')`)
        delimiter = "\n\t"
    }else{
        composed.push(`DB::table('${table}')`)
    }
    

    //select normal columns
    columns = composition.select.split(",").filter((x)=>(!x.trim().includes("select_subquery_function")&&x.trim()!="")).map(function(x){ return `"${x.trim()}"`}).join(", ")
    if(columns != "*"){
        composed.push(`->select(${columns})`)
    }

    for(column of select_raws){
        column = column.trim()
        composed.push(`->addSelect(DB::raw("${column}"))`)
    }

    //get selected columns
    for(column of composition.select.split(",")){
        column = column.trim()
        if(column.includes("select_subquery_function")){
            value = select_subqueries_functions[` ${column}`] ?? ""
            value = value.trim()
            if(value != ""){
                if(/^\(.+?/g.test(value)){ //subqueries
                    alias = getAlias(value)
                    if(alias != ""){
                        composed.push(`->addSelect(['${alias}' => ${getSubquery(value)}])`)    
                    }    
                }else{ //functions
                    composed.push(`->addSelect(DB::raw("${value}"))`)
                }
            }
        }
    }

    //only do where if there's a where clause
    if(composition.where.trim() != ""){
        //get where
        first_condition = composition.where.split(/and|or/)[0].trim()
        if(first_condition != ""){
            composed.push(where(first_condition, w))
        }

        //get all operators AND OR
        get_all = getAll(/and|or/g, composition.where.replace(first_condition, "").trim())
        operators = get_all.matches

        //get all conditions
        conditions = composition.where.trim().split(/and|or/g).map(function(x){return x.trim()})

        x = 0
        for(condition of conditions){
            if(x == 0){
                x++;
                continue
            }
            pre = (operators[x-1] ?? "") == "or" ? "orWhere" : "where"
            try{
                composed.push(where(condition, w, pre))
            }catch(e){
                console.log(x, conditions)
            }
            x++;
        }
    }

    //only do order by if there's a order by clause
    if(composition.order_by.trim() != ""){
        composed.push(`->orderBy(${composition.order_by.split(" ").map(function(x){ return `"${x}"`}).join(",")})`)
    }

    //only do limit if there's a limit clause
    if(composition.limit.trim() != ""){
        limit = composition.limit.trim()
        if(/offset|,/g.test(limit)){
            parts = limit.split(/offset|,/g)
            if(/offset/g.test(limit)){
                if(typeof parts[1] !== "undefined"){
                    composed.push(`->offset(${(parts[1] ?? "").trim()})`)
                }
                composed.push(`->limit(${parts[0].trim()})`)
            }else{
                composed.push(`->offset(${parts[0].trim()})`)
                if(typeof parts[1] !== "undefined"){
                    composed.push(`->limit(${(parts[1] ?? "").trim()})`)
                }
            }
        }else{
            composed.push(`->limit(${limit})`)
        }
    }

    return composed.join(delimiter)
}

function where(value, w, pre = "where"){
    parts = value.split(" ")
    if(typeof parts[1] == 'undefined' && typeof w[` ${parts[0].trim()}`] !== 'undefined'){
        return `->${pre}(DB::raw(${w[` ${parts[0]}`].trim()}))`
    }
    last = `"${parts[2]}"`
    if(value.includes("where_subquery_group")){
        condition = w[` ${parts[2].trim()}`].trim()
        if(/^(\(select|\( select)/g.test(condition)){
            last = getSubquery(condition)
        }else{
            last = "["+w[` ${parts[2]}`].trim().replace(/^\(/g,"").replace(/\)$/g,"")+"]"
        }
    }
    if(parts[1].trim() == "in"){
        return `->${pre}In("${parts[0]}", ${last})`
    }
    return `->${pre}("${parts[0]}", "${parts[1]}", ${last})`
}

function getSubquery(value){
    value = value.replace(/`(.+?)`$/g, "")
    return `function($query){\n\t${convertSQL(value, true)}\n}`
}

function getAlias(value){
    regex = /`.+?`$/g
    value = value.trim()
    matches = value.match(regex)

    if(!Array.isArray(matches)){
        matches = []
    }

    alias = matches[0] ?? ""
    return alias.replace(/`/g, "").trim()
}

function getAll(regex, input, alias = ""){
    result = {}
    matches = input.match(regex)

    if(!Array.isArray(matches)){
        matches = []
    }

    var x = 1
    for(match of matches){
        replace = ` ${alias}_${x}`
        if(alias == ""){
            replace = ""
        }
        input = input.replace(match, replace)
        result[replace] = match;
        x++
    }
    return {
        result : result,
        input : input,
        matches : matches
    }
}


