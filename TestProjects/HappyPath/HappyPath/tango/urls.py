from django.conf.urls import include, url

import tango.views

urlpatterns = [
    url(r'^generate-permutations', tango.views.generate_permutations, name = "generate_permutations"),
    url(r'^save-cases', tango.views.save_cases, name = "save_cases"),
    url(r'^get-cases', tango.views.get_cases, name = "get_cases"),
    url(r'^$', tango.views.view_select, name = "view_select"),
    url(r'^(?P<test_view_name>\'?\w+([-]\w+)*\'?)$', tango.views.testing, name = "testing")
]
