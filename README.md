# SQLtoEloquent

SQLtoEloquent is an app that let's you convert SQL Statements into Laravel Eloquent Query Builders. 

You can use the app [here](https://jjlabajo.github.io/SQLtoEloquent/).

## Sample
SQL Statement:
```sql
SELECT * FROM users WHERE age > 7;
```

Output:
```php
DB::table("users")
->where("age", ">", "7")
->get();
```

## Donate
Does this tool helped you in a way? You can help the developer too.

You can [Donate](https://www.paypal.com/donate?hosted_button_id=LK7HES83YDSES) any amount so he can maintain this tool and his future works. 

[Click here to donate.](https://www.paypal.com/donate?hosted_button_id=LK7HES83YDSES)


## Issues
Found bugs? Submit an issue [here](https://github.com/jjlabajo/SQLtoEloquent/issues).
