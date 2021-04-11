function convertToEloquent(input, is_subquery = false){
    input = input.toLowerCase();
    input = input.replace(";","");
    input = input.replace(/(\r\n|\n|\r)/gm, " ");
    input = input.replace(/\s+/gm, " ");

    regex = /\(.+?\) as `.+?`/g;
    subselect = input.match(regex)

    input = input.replace(regex, "");

    regex = /(in|=|<|>|<>|<=|>=)( *?\(.+?\))/g;
    subwhere = input.match(regex)
    if(!Array.isArray(subwhere)){
        subwhere = []
    }
    subquery_where = {}
    x = 1
    for(sub of subwhere){
        condition = sub.replace(/^(in|=|<|>|<>|<=|>=|!=)/g, "");
        count = `sub_query_where_${x}`
        input = input.replace(condition, ` ${count}`)
        subquery_where[count] = condition;
        x++
    }


    regex = /\(.+? (and|or) .+?\)/g
    grouped_condition = input.match(regex)
    if(!Array.isArray(grouped_condition)){
        grouped_condition = []
    }
    grouped_conditions = {}
    x = 1
    for(sub of grouped_condition){
        count = `grouped_condition_${x}`
        input = input.replace(/\(.+? (and|or) .+?\)/g, ` ${count}`)
        grouped_conditions[count] = grouped_condition;
        x++
    }
    
    var parts = input.split(/select | from | where | order by | limit /)

    var select = splitget(parts, 1, ",");

    var composition = {
        query : input,
        select : select,
        subselect: subselect,
        from : splitget(parts, 2, /left join|right join|inner join|full join|join/),
        where : splitget(parts, 3, /and/),
        order_by : splitget(parts, 4, ","),
        limit : splitget(parts, 5, ","),
        subquery_where : subquery_where,
        where_string : parts[3],
        grouped_conditions : grouped_conditions,
        grouped_condition : grouped_condition
    }
    return compose(composition, is_subquery)
}

function compose(composition, is_subquery = false){
    console.log(composition)
    prepend = "\n";
    if(is_subquery){
        prepend = "\n\t\t"
    }
    var table = composition.from[0].trim().split(" ")[0] ?? "";
    if(is_subquery){
        var query = `$query`;
    }else{
        var query = `DB::table("${table}")`
    }
    select = composition.select.filter((x)=>x.trim()!=="").map(function(x){ return `${x.includes("as") ? x.trim() : x.replace(/`/g,"").trim()}` })
    if(select.join(",") != "*" ){
        query += `${prepend}->select("${select.join(",")}")`
    }
    if(is_subquery){
        query += `${prepend}->from("${table}")`
    }
    add_select = []
    if(Array.isArray(composition.subselect)){
        for(sub of composition.subselect){
            var subquery = sub.replace(/as `.+?`/gm, "");
            var alias = sub.replace(subquery, "")
            subquery = subquery.trim()
            subquery = trimChar(subquery, "(")
            subquery = trimChar(subquery, ")")
            alias = alias.replace(/as|`/g, "").trim()
            query += `\n->addSelect(['${alias}' => function ($query) {
                ${convertToEloquent(subquery, true)}\n}])`
        }
    }
    if(Array.isArray(composition.where)){
        for(condition of composition.where){
            condition = condition.trim()
            condition = condition.replace("in(", "in (")
            var parts = condition.split(" ");
            if(condition.includes(" or ")){
                if(/\(.+? (and|or) .+?\)/g.test(condition)){
                    
                }
            }else{
                query += prepend+parseCondition(parts, composition)
            }
            break;
        }
    }
    return query
}

function parseCondition(parts, composition){
    if((parts[1]??"") == "in"){
        var comparison = parts[2] ?? "";
        var value = ""
        var subquery = composition.subquery_where[comparison] ?? ""
        subquery = subquery.trim()
        subquery = trimChar(subquery, "(")
        subquery = trimChar(subquery, ")")
        if(comparison.includes("sub_query_where_") && /and|or|select|from/g.test(subquery)){
            value = `function ($query) {
                \t\t${convertToEloquent(subquery, true)}
            }`
        }else{
            value = `[${trimChar(trimChar(subquery, ")"),"(")}]`
        }
        condition_query = `->whereIn("${parts[0]}", ${value})`
    }else if(condition.includes("is null")){
        condition_query = `->whereNull("${parts[0]}")`
    }else if(condition.includes("is not null")){
        condition_query = `->whereNotNull("${parts[0]}")`
    }else{
        condition_query = `->where("${parts[0]}", "${parts[1] ?? ""}", "${parts[2] ?? ""}")`
    }
    return condition_query
}

function splitget(parts, x,regex){
    var part = []
    if(typeof parts[x] !== 'undefined'){
        part = parts[x].split(regex)
    }
    return part
}

function trimChar(string, charToRemove) {
    while(string.charAt(0)==charToRemove) {
        string = string.substring(1);
    }

    while(string.charAt(string.length-1)==charToRemove) {
        string = string.substring(0,string.length-1);
    }

    return string;
}